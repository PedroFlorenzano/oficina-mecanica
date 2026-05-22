import { GetTimersByService } from "@/application/use-cases/timer/GetTimersByService";
import {
  ITimerLogRepository,
  TimerLogData,
} from "@/domain/repositories/ITimerLogRepository";
import { NotFoundError } from "@/domain/errors/DomainError";

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

const makeRepo = (logs: TimerLogData[] = []): ITimerLogRepository => ({
  create: jest.fn(),
  findById: jest.fn(),
  findByIdForTenant: jest.fn(),
  findActiveOrPausedByServiceAndUser: jest.fn(),
  findByOrderServiceId: jest.fn().mockResolvedValue(logs),
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
  tenantId: "tenant-1",
};

const mockOrderService = { id: "os-1", order: { tenantId: "tenant-1" } };

// ────────────────────────────────────────────────────────────
// Tests
// ────────────────────────────────────────────────────────────

describe("GetTimersByService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Requirement 5.4: OrderService não encontrado → NotFoundError ──

  it("deve lançar NotFoundError quando OrderService não existe", async () => {
    (prisma.orderService.findFirst as jest.Mock).mockResolvedValue(null);
    const repo = makeRepo();
    const useCase = new GetTimersByService(repo);

    await expect(useCase.execute(baseInput)).rejects.toThrow(NotFoundError);
  });

  // ── Requirement 5.2: tempo líquido = 0 quando não há sessões finalizadas ──

  it("deve retornar netSeconds = 0 e status 'sem sessão' quando não há nenhum TimerLog", async () => {
    (prisma.orderService.findFirst as jest.Mock).mockResolvedValue(mockOrderService);
    const repo = makeRepo([]); // nenhum log
    const useCase = new GetTimersByService(repo);

    const result = await useCase.execute(baseInput);

    expect(result.netSeconds).toBe(0);
    expect(result.status).toBe("sem sessão");
    expect(result.logs).toHaveLength(0);
  });

  it("deve retornar netSeconds = 0 quando há logs mas nenhum está finalizado", async () => {
    (prisma.orderService.findFirst as jest.Mock).mockResolvedValue(mockOrderService);
    // Log ativo (não finalizado)
    const activeLog = makeTimerLog({ id: "log-1", finishedAt: null, pausedAt: null });
    const repo = makeRepo([activeLog]);
    const useCase = new GetTimersByService(repo);

    const result = await useCase.execute(baseInput);

    expect(result.netSeconds).toBe(0);
  });

  it("deve somar totalSeconds apenas das sessões finalizadas", async () => {
    (prisma.orderService.findFirst as jest.Mock).mockResolvedValue(mockOrderService);
    const finishedLog1 = makeTimerLog({
      id: "log-1",
      finishedAt: new Date("2024-01-01T11:00:00Z"),
      totalSeconds: 3600,
    });
    const finishedLog2 = makeTimerLog({
      id: "log-2",
      finishedAt: new Date("2024-01-01T12:00:00Z"),
      totalSeconds: 1800,
    });
    const activeLog = makeTimerLog({ id: "log-3", finishedAt: null, pausedAt: null, totalSeconds: 500 });
    const repo = makeRepo([finishedLog1, finishedLog2, activeLog]);
    const useCase = new GetTimersByService(repo);

    const result = await useCase.execute(baseInput);

    // Apenas os logs finalizados devem ser somados (3600 + 1800 = 5400)
    expect(result.netSeconds).toBe(5400);
  });

  // ── Requirement 5.3: derivação de status com precedência ──

  it("deve retornar status 'ativa' quando existe pelo menos uma sessão ativa", async () => {
    (prisma.orderService.findFirst as jest.Mock).mockResolvedValue(mockOrderService);
    const activeLog = makeTimerLog({
      id: "log-1",
      finishedAt: null,
      pausedAt: null,
    });
    const repo = makeRepo([activeLog]);
    const useCase = new GetTimersByService(repo);

    const result = await useCase.execute(baseInput);

    expect(result.status).toBe("ativa");
  });

  it("deve retornar status 'ativa' mesmo quando existem também logs finalizados", async () => {
    (prisma.orderService.findFirst as jest.Mock).mockResolvedValue(mockOrderService);
    const finishedLog = makeTimerLog({
      id: "log-1",
      finishedAt: new Date("2024-01-01T10:30:00Z"),
      totalSeconds: 1800,
    });
    const activeLog = makeTimerLog({
      id: "log-2",
      finishedAt: null,
      pausedAt: null,
    });
    const repo = makeRepo([finishedLog, activeLog]);
    const useCase = new GetTimersByService(repo);

    const result = await useCase.execute(baseInput);

    expect(result.status).toBe("ativa");
  });

  it("deve retornar status 'pausada' quando existe log pausado e nenhum ativo", async () => {
    (prisma.orderService.findFirst as jest.Mock).mockResolvedValue(mockOrderService);
    const pausedLog = makeTimerLog({
      id: "log-1",
      pausedAt: new Date("2024-01-01T10:30:00Z"),
      finishedAt: null,
    });
    const repo = makeRepo([pausedLog]);
    const useCase = new GetTimersByService(repo);

    const result = await useCase.execute(baseInput);

    expect(result.status).toBe("pausada");
  });

  it("deve retornar status 'pausada' quando há logs finalizados e um log pausado (sem ativo)", async () => {
    (prisma.orderService.findFirst as jest.Mock).mockResolvedValue(mockOrderService);
    const finishedLog = makeTimerLog({
      id: "log-1",
      finishedAt: new Date("2024-01-01T10:30:00Z"),
      totalSeconds: 1800,
    });
    const pausedLog = makeTimerLog({
      id: "log-2",
      pausedAt: new Date("2024-01-01T11:00:00Z"),
      finishedAt: null,
    });
    const repo = makeRepo([finishedLog, pausedLog]);
    const useCase = new GetTimersByService(repo);

    const result = await useCase.execute(baseInput);

    expect(result.status).toBe("pausada");
  });

  it("deve retornar status 'finalizada' quando todos os logs têm finishedAt preenchido", async () => {
    (prisma.orderService.findFirst as jest.Mock).mockResolvedValue(mockOrderService);
    const finishedLog1 = makeTimerLog({
      id: "log-1",
      finishedAt: new Date("2024-01-01T10:30:00Z"),
      totalSeconds: 1800,
    });
    const finishedLog2 = makeTimerLog({
      id: "log-2",
      finishedAt: new Date("2024-01-01T12:00:00Z"),
      totalSeconds: 900,
    });
    const repo = makeRepo([finishedLog1, finishedLog2]);
    const useCase = new GetTimersByService(repo);

    const result = await useCase.execute(baseInput);

    expect(result.status).toBe("finalizada");
  });

  // ── Precedência: ativa tem prioridade sobre pausada ──

  it("deve retornar status 'ativa' (não 'pausada') quando existem tanto log ativo quanto log pausado", async () => {
    (prisma.orderService.findFirst as jest.Mock).mockResolvedValue(mockOrderService);
    const pausedLog = makeTimerLog({
      id: "log-1",
      pausedAt: new Date("2024-01-01T09:30:00Z"),
      finishedAt: null,
    });
    const activeLog = makeTimerLog({
      id: "log-2",
      finishedAt: null,
      pausedAt: null,
    });
    const repo = makeRepo([pausedLog, activeLog]);
    const useCase = new GetTimersByService(repo);

    const result = await useCase.execute(baseInput);

    expect(result.status).toBe("ativa");
  });

  // ── Verificação de retorno dos logs ──

  it("deve retornar todos os logs na resposta", async () => {
    (prisma.orderService.findFirst as jest.Mock).mockResolvedValue(mockOrderService);
    const log1 = makeTimerLog({ id: "log-1", finishedAt: new Date("2024-01-01T10:30:00Z"), totalSeconds: 1800 });
    const log2 = makeTimerLog({ id: "log-2", finishedAt: new Date("2024-01-01T12:00:00Z"), totalSeconds: 900 });
    const repo = makeRepo([log1, log2]);
    const useCase = new GetTimersByService(repo);

    const result = await useCase.execute(baseInput);

    expect(result.logs).toHaveLength(2);
    expect(result.logs[0].id).toBe("log-1");
    expect(result.logs[1].id).toBe("log-2");
  });

  it("deve chamar findByOrderServiceId com o orderServiceId correto", async () => {
    (prisma.orderService.findFirst as jest.Mock).mockResolvedValue(mockOrderService);
    const repo = makeRepo([]);
    const useCase = new GetTimersByService(repo);

    await useCase.execute(baseInput);

    expect(repo.findByOrderServiceId).toHaveBeenCalledWith("os-1");
  });
});
