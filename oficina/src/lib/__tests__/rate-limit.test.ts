import { NextRequest } from "next/server";
import { DAY, HOUR, enforceRateLimit, getClientIp } from "@/lib/rate-limit";
import { RateLimitError } from "@/domain/errors/DomainError";

const countMock = jest.fn();
const findFirstMock = jest.fn();
const createManyMock = jest.fn();
const deleteManyMock = jest.fn();

jest.mock("@/infrastructure/database/prisma", () => ({
  prismaAdmin: {
    rateLimitHit: {
      count: (...args: unknown[]) => countMock(...args),
      findFirst: (...args: unknown[]) => findFirstMock(...args),
      createMany: (...args: unknown[]) => createManyMock(...args),
      deleteMany: (...args: unknown[]) => deleteManyMock(...args),
    },
  },
}));

const makeRequest = (headers: Record<string, string>): NextRequest =>
  ({ headers: new Headers(headers) }) as unknown as NextRequest;

const rule = (key: string, limit: number, windowMs: number) => ({
  key,
  limit,
  windowMs,
  message: `limite de ${key}`,
});

describe("getClientIp", () => {
  it("usa o primeiro IP de x-forwarded-for", () => {
    const req = makeRequest({ "x-forwarded-for": "203.0.113.10, 70.41.3.18" });
    expect(getClientIp(req)).toBe("203.0.113.10");
  });

  it("cai para x-real-ip quando não há x-forwarded-for", () => {
    expect(getClientIp(makeRequest({ "x-real-ip": "198.51.100.7" }))).toBe("198.51.100.7");
  });

  it("retorna 'unknown' sem headers de IP (limite agregado, não liberado)", () => {
    expect(getClientIp(makeRequest({}))).toBe("unknown");
  });
});

describe("enforceRateLimit", () => {
  beforeEach(() => {
    countMock.mockReset();
    findFirstMock.mockReset();
    createManyMock.mockReset().mockResolvedValue({ count: 1 });
    deleteManyMock.mockReset().mockResolvedValue({ count: 0 });
    jest.spyOn(Math, "random").mockReturnValue(0.99); // desliga a limpeza oportunista
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("permite e registra o acesso quando está abaixo do limite", async () => {
    countMock.mockResolvedValue(1);

    await expect(
      enforceRateLimit([rule("register:ip:1.1.1.1", 3, HOUR)])
    ).resolves.toBeUndefined();

    expect(createManyMock).toHaveBeenCalledWith({
      data: [{ key: "register:ip:1.1.1.1" }],
    });
  });

  it("bloqueia com RateLimitError ao atingir o limite", async () => {
    countMock.mockResolvedValue(3);
    findFirstMock.mockResolvedValue({ createdAt: new Date(Date.now() - 10 * 60 * 1000) });

    await expect(
      enforceRateLimit([rule("register:ip:1.1.1.1", 3, HOUR)])
    ).rejects.toBeInstanceOf(RateLimitError);
  });

  it("não registra acesso quando bloqueia (evita punição perpétua)", async () => {
    countMock.mockResolvedValue(5);
    findFirstMock.mockResolvedValue({ createdAt: new Date() });

    await expect(enforceRateLimit([rule("k", 5, HOUR)])).rejects.toThrow();
    expect(createManyMock).not.toHaveBeenCalled();
  });

  it("calcula Retry-After a partir do hit mais antigo da janela", async () => {
    countMock.mockResolvedValue(3);
    // hit mais antigo há 50 minutos, janela de 1h → faltam ~10 min
    findFirstMock.mockResolvedValue({ createdAt: new Date(Date.now() - 50 * 60 * 1000) });

    try {
      await enforceRateLimit([rule("k", 3, HOUR)]);
      throw new Error("deveria ter lançado");
    } catch (error) {
      const rateLimit = error as RateLimitError;
      expect(rateLimit.retryAfterSeconds).toBeGreaterThan(9 * 60);
      expect(rateLimit.retryAfterSeconds).toBeLessThanOrEqual(10 * 60 + 1);
    }
  });

  it("aplica a primeira regra estourada quando há várias", async () => {
    // regra por hora OK, regra diária estourada
    countMock.mockResolvedValueOnce(1).mockResolvedValueOnce(5);
    findFirstMock.mockResolvedValue({ createdAt: new Date() });

    await expect(
      enforceRateLimit([
        rule("register:ip:1.1.1.1", 3, HOUR),
        rule("register:ip:1.1.1.1:day", 5, DAY),
      ])
    ).rejects.toThrow("limite de register:ip:1.1.1.1:day");
  });

  it("registra um hit por regra quando todas passam", async () => {
    countMock.mockResolvedValue(0);

    await enforceRateLimit([rule("a", 3, HOUR), rule("b", 30, HOUR)]);

    expect(createManyMock).toHaveBeenCalledWith({ data: [{ key: "a" }, { key: "b" }] });
  });
});
