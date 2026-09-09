import { isTurnstileEnabled, verifyTurnstile } from "@/lib/turnstile";
import { ValidationError } from "@/domain/errors/DomainError";

describe("turnstile", () => {
  const originalSecret = process.env.TURNSTILE_SECRET_KEY;
  const originalFetch = global.fetch;

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.TURNSTILE_SECRET_KEY;
    else process.env.TURNSTILE_SECRET_KEY = originalSecret;
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("fica desabilitado sem TURNSTILE_SECRET_KEY", async () => {
    delete process.env.TURNSTILE_SECRET_KEY;
    expect(isTurnstileEnabled()).toBe(false);
    // sem chave, não exige token nem chama a Cloudflare
    await expect(verifyTurnstile(undefined)).resolves.toBeUndefined();
  });

  it("exige token quando habilitado", async () => {
    process.env.TURNSTILE_SECRET_KEY = "secret";
    await expect(verifyTurnstile("")).rejects.toBeInstanceOf(ValidationError);
    await expect(verifyTurnstile(undefined)).rejects.toBeInstanceOf(ValidationError);
  });

  it("aceita token válido", async () => {
    process.env.TURNSTILE_SECRET_KEY = "secret";
    global.fetch = jest.fn().mockResolvedValue({ json: async () => ({ success: true }) }) as unknown as typeof fetch;

    await expect(verifyTurnstile("token-ok", "203.0.113.10")).resolves.toBeUndefined();
    expect(global.fetch).toHaveBeenCalled();
  });

  it("rejeita token inválido", async () => {
    process.env.TURNSTILE_SECRET_KEY = "secret";
    global.fetch = jest.fn().mockResolvedValue({ json: async () => ({ success: false }) }) as unknown as typeof fetch;

    await expect(verifyTurnstile("token-ruim")).rejects.toBeInstanceOf(ValidationError);
  });

  it("explica token reusado/expirado (timeout-or-duplicate)", async () => {
    process.env.TURNSTILE_SECRET_KEY = "secret";
    jest.spyOn(console, "error").mockImplementation(() => {});
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({ success: false, "error-codes": ["timeout-or-duplicate"] }),
    }) as unknown as typeof fetch;

    await expect(verifyTurnstile("token")).rejects.toThrow(/expirou/i);
  });

  it("sinaliza erro de configuração quando a secret é inválida", async () => {
    process.env.TURNSTILE_SECRET_KEY = "secret-errada";
    jest.spyOn(console, "error").mockImplementation(() => {});
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({ success: false, "error-codes": ["invalid-input-secret"] }),
    }) as unknown as typeof fetch;

    await expect(verifyTurnstile("token")).rejects.toThrow(/configuração/i);
  });

  it("inclui o código da Cloudflare na mensagem genérica", async () => {
    process.env.TURNSTILE_SECRET_KEY = "secret";
    jest.spyOn(console, "error").mockImplementation(() => {});
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({ success: false, "error-codes": ["invalid-input-response"] }),
    }) as unknown as typeof fetch;

    await expect(verifyTurnstile("token")).rejects.toThrow(/invalid-input-response/);
  });

  it("não bloqueia cadastro se a Cloudflare estiver fora do ar", async () => {
    process.env.TURNSTILE_SECRET_KEY = "secret";
    jest.spyOn(console, "error").mockImplementation(() => {});
    global.fetch = jest.fn().mockRejectedValue(new Error("network")) as unknown as typeof fetch;

    await expect(verifyTurnstile("token")).resolves.toBeUndefined();
  });
});
