import { StartTimer } from "@/application/use-cases/timer/StartTimer";
import {
  ITimerLogRepository,
  TimerLogData,
} from "@/domain/repositories/ITimerLogRepository";
import {
  ForbiddenError,
  NotFoundError,
  ConflictError,
  BusinessRuleError,
} from "@/domain/errors/DomainError";

// Mock the Prisma module
jest.mock("@/infrastructure/database/prisma", () => ({
  prisma: {
    orderService: {
      findFirst: jest.fn(),
    },
  },
}));

import { prisma } from "@/infrastructure/database/prisma";

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

const makeTimerLog = (overrides: Partial<TimerLogData> = {}): TimerLogData => ({
  id: "timer-log-1",
  startedAt: new Date("2024-01-01T10:00:00Z"),
  pausedAt: null,
  finishedAt: null,
  pauseReason: null,
  totalSeconds: 0,
  orderServiceId: "os-1",
  userId: "mechanic-1",
  createdAt: new Date("2024-01-01T10:00:00Z"),
  ...overrides,
});

/** Builds a minimal OrderService Prisma response */
const makeOrderService = (overrides: {
  mechanicId?: string | null;
  status?: string;
  tenantId?: string;
} = {}) => ({
  id: "os-1",
  mechanicId: overrides.mechanicId !== undefined ? overrides.mechanicId : null,
  order: {
    tenantId: overrides.tenantId ?? "tenant-1",
    status: overrides.status ?? "OPEN",
  },
});

const makeRepo = (
  existingSession: TimerLogData | null = null
): ITimerLogRepository => ({
  create: jest.fn().mockResolvedValue(makeTimerLog()),
  findById: jest.fn(),
  findByIdForTenant: jest.fn(),
  findActiveOrPausedByServiceAndUser: jest.fn().mockResolvedValue(existingSession),
  findByOrderServiceId: jest.fn(),
  findByOrderId: jest.fn(),
  updateTotalSeconds: jest.fn(),
  updatePause: jest.fn(),
  updateFinish: jest.fn(),
  sumFinishedSeconds: jest.fn(),
  updateOrderServiceMinutes: jest.fn(),
  createAuditLog: jest.fn(),
});

const baseInput = {
  orderServiceId: "os-1",
  userId: "mechanic-1",
  tenantId: "tenant-1",
  userRole: "MECHANIC",
};

// ────────────────────────────────────────────────────────────
// Tests
// ────────────────────────────────────────────────────────────

describe("StartTimer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Requirement 1.5: role !== MECHANIC → ForbiddenError ──

  it("deve lançar ForbiddenError quando userRole é ATTENDANT", async () => {
    const repo = makeRepo();
    const useCase = new StartTimer(repo);

    await expect(
      useCase.execute({ ...baseInput, userRole: "ATTENDANT" })
    ).rejects.toThrow(ForbiddenError);
  });

  it("deve lançar ForbiddenError quando userRole é ADMIN", async () => {
    const repo = makeRepo();
    const useCase = new StartTimer(repo);

    await expect(
      useCase.execute({ ...baseInput, userRole: "ADMIN" })
    ).rejects.toThrow(ForbiddenError);
  });

  // ── Requirement 1.7: OS com status COMPLETED/CANCELLED/DELIVERED → BusinessRuleError ──

  it("deve lançar BusinessRuleError quando OS está COMPLETED", async () => {
    (prisma.orderService.findFirst as jest.Mock).mockResolvedValue(
      makeOrderService({ status: "COMPLETED" })
    );
    const repo = makeRepo();
    const useCase = new StartTimer(repo);

    await expect(useCase.execute(baseInput)).rejects.toThrow(BusinessRuleError);
  });

  it("deve lançar BusinessRuleError quando OS está CANCELLED", async () => {
    (prisma.orderService.findFirst as jest.Mock).mockResolvedValue(
      makeOrderService({ status: "CANCELLED" })
    );
    const repo = makeRepo();
    const useCase = new StartTimer(repo);

    await expect(useCase.execute(baseInput)).rejects.toThrow(BusinessRuleError);
  });

  it("deve lançar BusinessRuleError quando OS está DELIVERED", async () => {
    (prisma.orderService.findFirst as jest.Mock).mockResolvedValue(
      makeOrderService({ status: "DELIVERED" })
    );
    const repo = makeRepo();
    const useCase = new StartTimer(repo);

    await expect(useCase.execute(baseInput)).rejects.toThrow(BusinessRuleError);
  });

  // ── Requirement 1.8: mechanicId diferente do userId → ForbiddenError ──

  it("deve lançar ForbiddenError quando mechanicId pertence a outro mecânico", async () => {
    (prisma.orderService.findFirst as jest.Mock).mockResolvedValue(
      makeOrderService({ mechanicId: "outro-mecanico" })
    );
    const repo = makeRepo();
    const useCase = new StartTimer(repo);

    await expect(useCase.execute(baseInput)).rejects.toThrow(ForbiddenError);
  });

  // ── Requirement 1.3: sessão ativa já existente → ConflictError ──

  it("deve lançar ConflictError quando já existe sessão ativa para o mesmo (serviceId, userId)", async () => {
    (prisma.orderService.findFirst as jest.Mock).mockResolvedValue(
      makeOrderService()
    );
    const existingSession = makeTimerLog(); // finishedAt = null → ativa
    const repo = makeRepo(existingSession);
    const useCase = new StartTimer(repo);

    await expect(useCase.execute(baseInput)).rejects.toThrow(ConflictError);
  });

  it("deve lançar ConflictError quando já existe sessão pausada para o mesmo (serviceId, userId)", async () => {
    (prisma.orderService.findFirst as jest.Mock).mockResolvedValue(
      makeOrderService()
    );
    const pausedSession = makeTimerLog({
      pausedAt: new Date("2024-01-01T10:30:00Z"),
    });
    const repo = makeRepo(pausedSession);
    const useCase = new StartTimer(repo);

    await expect(useCase.execute(baseInput)).rejects.toThrow(ConflictError);
  });

  // ── Requirement 1.4: OrderService não encontrado → NotFoundError ──

  it("deve lançar NotFoundError quando OrderService não existe", async () => {
    (prisma.orderService.findFirst as jest.Mock).mockResolvedValue(null);
    const repo = makeRepo();
    const useCase = new StartTimer(repo);

    await expect(useCase.execute(baseInput)).rejects.toThrow(NotFoundError);
  });

  it("deve lançar NotFoundError quando OrderService pertence a outro tenant", async () => {
    (prisma.orderService.findFirst as jest.Mock).mockResolvedValue(
      makeOrderService({ tenantId: "outro-tenant" })
    );
    const repo = makeRepo();
    const useCase = new StartTimer(repo);

    await expect(useCase.execute(baseInput)).rejects.toThrow(NotFoundError);
  });

  // ── Requirements 1.1, 1.2, 1.6: criação bem-sucedida retorna TimerLog com campos corretos ──

  it("deve criar e retornar um TimerLog com os campos corretos em caso de sucesso", async () => {
    (prisma.orderService.findFirst as jest.Mock).mockResolvedValue(
      makeOrderService()
    );
    const repo = makeRepo(null);
    const expectedLog = makeTimerLog();
    (repo.create as jest.Mock).mockResolvedValue(expectedLog);
    const useCase = new StartTimer(repo);

    const result = await useCase.execute(baseInput);

    expect(result).toEqual(expectedLog);
    expect(result.orderServiceId).toBe("os-1");
    expect(result.userId).toBe("mechanic-1");
    expect(result.pausedAt).toBeNull();
    expect(result.finishedAt).toBeNull();
    expect(result.totalSeconds).toBe(0);
    expect(result.pauseReason).toBeNull();
  });

  it("deve chamar repository.create com os dados corretos", async () => {
    (prisma.orderService.findFirst as jest.Mock).mockResolvedValue(
      makeOrderService()
    );
    const repo = makeRepo(null);
    const useCase = new StartTimer(repo);

    await useCase.execute(baseInput);

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        orderServiceId: "os-1",
        userId: "mechanic-1",
        pausedAt: null,
        finishedAt: null,
        pauseReason: null,
        totalSeconds: 0,
      })
    );
  });

  it("deve permitir iniciar quando mechanicId é null (serviço não atribuído)", async () => {
    (prisma.orderService.findFirst as jest.Mock).mockResolvedValue(
      makeOrderService({ mechanicId: null })
    );
    const repo = makeRepo(null);
    const useCase = new StartTimer(repo);

    await expect(useCase.execute(baseInput)).resolves.toBeDefined();
  });

  it("deve permitir iniciar quando mechanicId é igual ao userId", async () => {
    (prisma.orderService.findFirst as jest.Mock).mockResolvedValue(
      makeOrderService({ mechanicId: "mechanic-1" })
    );
    const repo = makeRepo(null);
    const useCase = new StartTimer(repo);

    await expect(useCase.execute(baseInput)).resolves.toBeDefined();
  });
});
