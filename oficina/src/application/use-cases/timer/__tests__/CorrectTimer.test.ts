import { CorrectTimer } from "@/application/use-cases/timer/CorrectTimer";
import { ITimerLogRepository, TimerLogData } from "@/domain/repositories/ITimerLogRepository";
import {
  BusinessRuleError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/domain/errors/DomainError";

// ---------- helpers ----------

function makeTimerLogData(overrides: Partial<TimerLogData> = {}): TimerLogData {
  return {
    id: "timer-log-1",
    startedAt: new Date(Date.now() - 3_600_000), // 1 hour ago
    pausedAt: null,
    finishedAt: new Date(Date.now() - 1_800_000), // finished 30 min ago
    pauseReason: null,
    totalSeconds: 1800,
    orderServiceId: "order-service-1",
    userId: "mechanic-user-1",
    createdAt: new Date(),
    ...overrides,
  };
}

function makeRepo(
  timerLog: TimerLogData | null = makeTimerLogData(),
  sumSeconds = 1800
): jest.Mocked<ITimerLogRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findByIdForTenant: jest.fn().mockResolvedValue(timerLog),
    findActiveOrPausedByServiceAndUser: jest.fn(),
    findByOrderServiceId: jest.fn(),
    findByOrderId: jest.fn(),
    updateTotalSeconds: jest.fn().mockImplementation(async (id, totalSeconds) => ({
      ...makeTimerLogData(),
      id,
      totalSeconds,
    })),
    updatePause: jest.fn(),
    updateFinish: jest.fn(),
    sumFinishedSeconds: jest.fn().mockResolvedValue(sumSeconds),
    updateOrderServiceMinutes: jest.fn().mockResolvedValue(undefined),
    createAuditLog: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<ITimerLogRepository>;
}

const BASE_DTO = {
  timerLogId: "timer-log-1",
  newTotalSeconds: 3600,
  adminUserId: "admin-user-1",
  tenantId: "tenant-1",
  userRole: "ADMIN",
};

// ---------- tests ----------

describe("CorrectTimer", () => {
  // ----------------------------------------------------------------
  // Requirement 7.6 — somente ADMIN pode corrigir
  // ----------------------------------------------------------------
  describe("cenário: role inválida (MECHANIC/ATTENDANT)", () => {
    it("deve lançar ForbiddenError quando userRole é MECHANIC", async () => {
      const repo = makeRepo();
      const useCase = new CorrectTimer(repo);

      await expect(
        useCase.execute({ ...BASE_DTO, userRole: "MECHANIC" })
      ).rejects.toThrow(ForbiddenError);
    });

    it("deve lançar ForbiddenError quando userRole é ATTENDANT", async () => {
      const repo = makeRepo();
      const useCase = new CorrectTimer(repo);

      await expect(
        useCase.execute({ ...BASE_DTO, userRole: "ATTENDANT" })
      ).rejects.toThrow(ForbiddenError);
    });
  });

  // ----------------------------------------------------------------
  // Requirement 7.4 — TimerLog não encontrado
  // ----------------------------------------------------------------
  describe("cenário: TimerLog não encontrado", () => {
    it("deve lançar NotFoundError quando findByIdForTenant retorna null", async () => {
      const repo = makeRepo(null);
      const useCase = new CorrectTimer(repo);

      await expect(useCase.execute(BASE_DTO)).rejects.toThrow(NotFoundError);
    });
  });

  // ----------------------------------------------------------------
  // Requirement 7.5 — somente sessões finalizadas podem ser corrigidas
  // ----------------------------------------------------------------
  describe("cenário: correção em sessão não finalizada", () => {
    it("deve lançar BusinessRuleError quando finishedAt é null (sessão ativa)", async () => {
      const activeLog = makeTimerLogData({ finishedAt: null });
      const repo = makeRepo(activeLog);
      const useCase = new CorrectTimer(repo);

      await expect(useCase.execute(BASE_DTO)).rejects.toThrow(BusinessRuleError);
    });

    it("deve lançar BusinessRuleError quando sessão está pausada (finishedAt null, pausedAt preenchido)", async () => {
      const pausedLog = makeTimerLogData({ finishedAt: null, pausedAt: new Date() });
      const repo = makeRepo(pausedLog);
      const useCase = new CorrectTimer(repo);

      await expect(useCase.execute(BASE_DTO)).rejects.toThrow(BusinessRuleError);
    });
  });

  // ----------------------------------------------------------------
  // Requirement 7.2 — newTotalSeconds fora do intervalo [0, 86400]
  // ----------------------------------------------------------------
  describe("cenário: totalSeconds inválido", () => {
    it("deve lançar ValidationError quando newTotalSeconds = -1", async () => {
      const repo = makeRepo();
      const useCase = new CorrectTimer(repo);

      await expect(
        useCase.execute({ ...BASE_DTO, newTotalSeconds: -1 })
      ).rejects.toThrow(ValidationError);
    });

    it("deve lançar ValidationError quando newTotalSeconds = 86401", async () => {
      const repo = makeRepo();
      const useCase = new CorrectTimer(repo);

      await expect(
        useCase.execute({ ...BASE_DTO, newTotalSeconds: 86401 })
      ).rejects.toThrow(ValidationError);
    });

    it("deve lançar ValidationError quando newTotalSeconds não é inteiro (ex: 3600.5)", async () => {
      const repo = makeRepo();
      const useCase = new CorrectTimer(repo);

      await expect(
        useCase.execute({ ...BASE_DTO, newTotalSeconds: 3600.5 })
      ).rejects.toThrow(ValidationError);
    });
  });

  // ----------------------------------------------------------------
  // Requirement 7.7 — correção bem-sucedida registra TimerAuditLog
  // ----------------------------------------------------------------
  describe("cenário feliz — correção bem-sucedida", () => {
    it("deve registrar TimerAuditLog com previousTotalSeconds e newTotalSeconds corretos", async () => {
      const originalLog = makeTimerLogData({ totalSeconds: 1800 });
      const repo = makeRepo(originalLog);
      const useCase = new CorrectTimer(repo);

      await useCase.execute({ ...BASE_DTO, newTotalSeconds: 3600 });

      expect(repo.createAuditLog).toHaveBeenCalledTimes(1);
      expect(repo.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          timerLogId: "timer-log-1",
          adminUserId: "admin-user-1",
          previousTotalSeconds: 1800,
          newTotalSeconds: 3600,
          changedAt: expect.any(Date),
        })
      );
    });

    it("deve chamar updateTotalSeconds com o novo valor", async () => {
      const repo = makeRepo();
      const useCase = new CorrectTimer(repo);

      await useCase.execute({ ...BASE_DTO, newTotalSeconds: 4200 });

      expect(repo.updateTotalSeconds).toHaveBeenCalledWith("timer-log-1", 4200);
    });

    it("deve recalcular e atualizar timeMinutes do OrderService com floor(sumSeconds / 60)", async () => {
      const sumSeconds = 3700; // 61 min 40 s → floor = 61
      const repo = makeRepo(makeTimerLogData(), sumSeconds);
      const useCase = new CorrectTimer(repo);

      await useCase.execute(BASE_DTO);

      expect(repo.sumFinishedSeconds).toHaveBeenCalledWith("order-service-1");
      expect(repo.updateOrderServiceMinutes).toHaveBeenCalledWith(
        "order-service-1",
        Math.floor(sumSeconds / 60) // 61
      );
    });

    it("deve retornar o TimerLog atualizado", async () => {
      const repo = makeRepo();
      const useCase = new CorrectTimer(repo);

      const result = await useCase.execute({ ...BASE_DTO, newTotalSeconds: 3600 });

      expect(result).toBeDefined();
      expect(result.id).toBe("timer-log-1");
      expect(result.totalSeconds).toBe(3600);
    });

    it("deve aceitar newTotalSeconds = 0 (limite inferior válido)", async () => {
      const repo = makeRepo();
      const useCase = new CorrectTimer(repo);

      await expect(
        useCase.execute({ ...BASE_DTO, newTotalSeconds: 0 })
      ).resolves.toBeDefined();
    });

    it("deve aceitar newTotalSeconds = 86400 (limite superior válido)", async () => {
      const repo = makeRepo();
      const useCase = new CorrectTimer(repo);

      await expect(
        useCase.execute({ ...BASE_DTO, newTotalSeconds: 86400 })
      ).resolves.toBeDefined();
    });
  });
});
