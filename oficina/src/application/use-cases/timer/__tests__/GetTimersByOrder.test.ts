import { GetTimersByOrder } from "@/application/use-cases/timer/GetTimersByOrder";
import {
  ITimerLogRepository,
  TimerServiceSummary,
} from "@/domain/repositories/ITimerLogRepository";
import { NotFoundError } from "@/domain/errors/DomainError";

// Mock the Prisma module
jest.mock("@/infrastructure/database/prisma", () => ({
  prisma: {
    serviceOrder: {
      findFirst: jest.fn(),
    },
  },
}));

import { prisma } from "@/infrastructure/database/prisma";

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

const makeRepo = (
  summaries: TimerServiceSummary[] = []
): ITimerLogRepository => ({
  create: jest.fn(),
  findById: jest.fn(),
  findByIdForTenant: jest.fn(),
  findActiveOrPausedByServiceAndUser: jest.fn(),
  findByOrderServiceId: jest.fn(),
  findByOrderId: jest.fn().mockResolvedValue(summaries),
  updateTotalSeconds: jest.fn(),
  updatePause: jest.fn(),
  updateFinish: jest.fn(),
  sumFinishedSeconds: jest.fn(),
  updateOrderServiceMinutes: jest.fn(),
  createAuditLog: jest.fn(),
});

const baseInput = {
  orderId: "order-1",
  tenantId: "tenant-1",
};

// ────────────────────────────────────────────────────────────
// Tests
// ────────────────────────────────────────────────────────────

describe("GetTimersByOrder", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Requirement 6.3: orderId não existe no tenant → NotFoundError ──

  it("deve lançar NotFoundError quando orderId não existe no tenant", async () => {
    (prisma.serviceOrder.findFirst as jest.Mock).mockResolvedValue(null);
    const repo = makeRepo();
    const useCase = new GetTimersByOrder(repo);

    await expect(useCase.execute(baseInput)).rejects.toThrow(NotFoundError);
  });

  it("deve lançar NotFoundError sem revelar dados de outro tenant", async () => {
    (prisma.serviceOrder.findFirst as jest.Mock).mockResolvedValue(null);
    const repo = makeRepo();
    const useCase = new GetTimersByOrder(repo);

    const error = await useCase.execute(baseInput).catch((e) => e);

    expect(error).toBeInstanceOf(NotFoundError);
    expect(repo.findByOrderId).not.toHaveBeenCalled();
  });

  // ── Requirement 6.1: OrderService sem timers é incluído com netSeconds 0 e status "sem sessão" ──

  it("deve incluir serviço sem timers com netSeconds 0 e status 'sem sessão'", async () => {
    (prisma.serviceOrder.findFirst as jest.Mock).mockResolvedValue({
      id: "order-1",
      tenantId: "tenant-1",
    });

    const summaryWithoutLogs: TimerServiceSummary = {
      orderServiceId: "service-1",
      serviceDescription: "Troca de óleo",
      mechanicName: null,
      netSeconds: 0,
      status: "sem sessão",
      logs: [],
    };

    const repo = makeRepo([summaryWithoutLogs]);
    const useCase = new GetTimersByOrder(repo);

    const result = await useCase.execute(baseInput);

    expect(result).toHaveLength(1);
    const service = result[0];
    expect(service.orderServiceId).toBe("service-1");
    expect(service.netSeconds).toBe(0);
    expect(service.status).toBe("sem sessão");
    expect(service.logs).toHaveLength(0);
  });

  it("deve retornar todos os serviços incluindo os que não possuem TimerLogs", async () => {
    (prisma.serviceOrder.findFirst as jest.Mock).mockResolvedValue({
      id: "order-1",
      tenantId: "tenant-1",
    });

    const summaries: TimerServiceSummary[] = [
      {
        orderServiceId: "service-1",
        serviceDescription: "Troca de óleo",
        mechanicName: "João Silva",
        netSeconds: 3600,
        status: "finalizada",
        logs: [
          {
            id: "log-1",
            startedAt: new Date("2024-01-01T08:00:00Z"),
            pausedAt: null,
            finishedAt: new Date("2024-01-01T09:00:00Z"),
            pauseReason: null,
            totalSeconds: 3600,
            orderServiceId: "service-1",
            userId: "mechanic-1",
            createdAt: new Date("2024-01-01T08:00:00Z"),
          },
        ],
      },
      {
        orderServiceId: "service-2",
        serviceDescription: "Alinhamento",
        mechanicName: null,
        netSeconds: 0,
        status: "sem sessão",
        logs: [],
      },
    ];

    const repo = makeRepo(summaries);
    const useCase = new GetTimersByOrder(repo);

    const result = await useCase.execute(baseInput);

    expect(result).toHaveLength(2);
    expect(result[0].netSeconds).toBe(3600);
    expect(result[0].status).toBe("finalizada");
    expect(result[1].netSeconds).toBe(0);
    expect(result[1].status).toBe("sem sessão");
    expect(result[1].logs).toHaveLength(0);
  });

  it("deve chamar findByOrderId com os parâmetros corretos", async () => {
    (prisma.serviceOrder.findFirst as jest.Mock).mockResolvedValue({
      id: "order-1",
      tenantId: "tenant-1",
    });

    const repo = makeRepo([]);
    const useCase = new GetTimersByOrder(repo);

    await useCase.execute(baseInput);

    expect(repo.findByOrderId).toHaveBeenCalledWith("order-1", "tenant-1");
  });
});
