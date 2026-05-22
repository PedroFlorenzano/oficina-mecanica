import { ResumeTimer } from "@/application/use-cases/timer/ResumeTimer";
import { ITimerLogRepository, TimerLogData } from "@/domain/repositories/ITimerLogRepository";
import {
  BusinessRuleError,
  ForbiddenError,
  NotFoundError,
} from "@/domain/errors/DomainError";

// ---------- helpers ----------

const FIXED_STARTED_AT = new Date("2024-01-01T10:00:00.000Z");
const FIXED_PAUSED_AT = new Date("2024-01-01T10:02:00.000Z"); // 120 seconds after start

function makePausedTimerLog(overrides: Partial<TimerLogData> = {}): TimerLogData {
  return {
    id: "timer-log-1",
    startedAt: FIXED_STARTED_AT,
    pausedAt: FIXED_PAUSED_AT,
    finishedAt: null,
    pauseReason: "Pausa para almoço",
    totalSeconds: 30, // already accumulated from a previous session
    orderServiceId: "order-service-1",
    userId: "mechanic-user-1",
    createdAt: new Date("2024-01-01T09:00:00.000Z"),
    ...overrides,
  };
}

function makeNewTimerLog(overrides: Partial<TimerLogData> = {}): TimerLogData {
  return {
    id: "timer-log-2",
    startedAt: new Date(),
    pausedAt: null,
    finishedAt: null,
    pauseReason: null,
    totalSeconds: 0,
    orderServiceId: "order-service-1",
    userId: "mechanic-user-1",
    createdAt: new Date(),
    ...overrides,
  };
}

function makeRepo(
  timerLog: TimerLogData | null = makePausedTimerLog(),
  createdLog: TimerLogData = makeNewTimerLog()
): jest.Mocked<ITimerLogRepository> {
  return {
    create: jest.fn().mockResolvedValue(createdLog),
    findById: jest.fn(),
    findByIdForTenant: jest.fn().mockResolvedValue(timerLog),
    findActiveOrPausedByServiceAndUser: jest.fn(),
    findByOrderServiceId: jest.fn(),
    findByOrderId: jest.fn(),
    updateTotalSeconds: jest.fn().mockImplementation(async (id, totalSeconds) => ({
      ...makePausedTimerLog(),
      id,
      totalSeconds,
    })),
    updatePause: jest.fn(),
    updateFinish: jest.fn(),
    sumFinishedSeconds: jest.fn(),
    updateOrderServiceMinutes: jest.fn(),
    createAuditLog: jest.fn(),
  } as unknown as jest.Mocked<ITimerLogRepository>;
}

const BASE_DTO = {
  timerLogId: "timer-log-1",
  userId: "mechanic-user-1",
  tenantId: "tenant-1",
  userRole: "MECHANIC",
};

// ---------- tests ----------

describe("ResumeTimer", () => {
  // ----------------------------------------------------------------
  // Happy path — Requirement 3.1, 3.2, 3.7
  // ----------------------------------------------------------------
  describe("cenário: retomada bem-sucedida", () => {
    it("deve chamar updateTotalSeconds com os segundos consolidados do TimerLog pausado", async () => {
      const repo = makeRepo();
      const useCase = new ResumeTimer(repo);

      await useCase.execute(BASE_DTO);

      // elapsed = floor((FIXED_PAUSED_AT - FIXED_STARTED_AT) / 1000) = 120s
      // consolidatedTotal = totalSeconds(30) + elapsed(120) = 150
      expect(repo.updateTotalSeconds).toHaveBeenCalledWith("timer-log-1", 150);
    });

    it("deve criar um novo TimerLog com totalSeconds = 0 e pausedAt = null", async () => {
      const repo = makeRepo();
      const useCase = new ResumeTimer(repo);

      await useCase.execute(BASE_DTO);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          orderServiceId: "order-service-1",
          userId: "mechanic-user-1",
          totalSeconds: 0,
          pausedAt: null,
          finishedAt: null,
        })
      );
    });

    it("deve retornar o novo TimerLog criado", async () => {
      const newLog = makeNewTimerLog({ id: "timer-log-2" });
      const repo = makeRepo(makePausedTimerLog(), newLog);
      const useCase = new ResumeTimer(repo);

      const result = await useCase.execute(BASE_DTO);

      expect(result).toBe(newLog);
      expect(result.id).toBe("timer-log-2");
      expect(result.totalSeconds).toBe(0);
      expect(result.pausedAt).toBeNull();
    });

    it("deve consultar o TimerLog pelo id e tenantId corretos", async () => {
      const repo = makeRepo();
      const useCase = new ResumeTimer(repo);

      await useCase.execute(BASE_DTO);

      expect(repo.findByIdForTenant).toHaveBeenCalledWith("timer-log-1", "tenant-1");
    });

    it("deve calcular corretamente o consolidado quando totalSeconds acumulado é zero", async () => {
      const logWithNoAccumulated = makePausedTimerLog({ totalSeconds: 0 });
      const repo = makeRepo(logWithNoAccumulated);
      const useCase = new ResumeTimer(repo);

      await useCase.execute(BASE_DTO);

      // elapsed = 120s, totalSeconds = 0 → consolidatedTotal = 120
      expect(repo.updateTotalSeconds).toHaveBeenCalledWith("timer-log-1", 120);
    });
  });

  // ----------------------------------------------------------------
  // Requirement 3.5 — cronômetro não está pausado (estado Ativo)
  // ----------------------------------------------------------------
  describe("cenário: retomar cronômetro Ativo (não pausado) → BusinessRuleError", () => {
    it("deve lançar BusinessRuleError quando o TimerLog está ativo (pausedAt é null)", async () => {
      const activeLog = makePausedTimerLog({ pausedAt: null });
      const repo = makeRepo(activeLog);
      const useCase = new ResumeTimer(repo);

      await expect(useCase.execute(BASE_DTO)).rejects.toThrow(BusinessRuleError);
    });

    it("deve lançar BusinessRuleError quando o TimerLog já está finalizado (finishedAt preenchido)", async () => {
      const finishedLog = makePausedTimerLog({
        pausedAt: null,
        finishedAt: new Date(),
      });
      const repo = makeRepo(finishedLog);
      const useCase = new ResumeTimer(repo);

      await expect(useCase.execute(BASE_DTO)).rejects.toThrow(BusinessRuleError);
    });

    it("deve lançar BusinessRuleError quando o TimerLog está finalizado mesmo com pausedAt preenchido", async () => {
      const finishedAndPausedLog = makePausedTimerLog({
        finishedAt: new Date(),
      });
      const repo = makeRepo(finishedAndPausedLog);
      const useCase = new ResumeTimer(repo);

      await expect(useCase.execute(BASE_DTO)).rejects.toThrow(BusinessRuleError);
    });
  });

  // ----------------------------------------------------------------
  // Requirement 3.6 — TimerLog não pertence ao userId
  // ----------------------------------------------------------------
  describe("cenário: TimerLog não pertence ao userId → ForbiddenError", () => {
    it("deve lançar ForbiddenError quando o TimerLog pertence a outro mecânico", async () => {
      const otherUserLog = makePausedTimerLog({ userId: "outro-mecanico" });
      const repo = makeRepo(otherUserLog);
      const useCase = new ResumeTimer(repo);

      await expect(useCase.execute(BASE_DTO)).rejects.toThrow(ForbiddenError);
    });
  });

  // ----------------------------------------------------------------
  // Requirement 3.3 — TimerLog não encontrado
  // ----------------------------------------------------------------
  describe("cenário: TimerLog não encontrado", () => {
    it("deve lançar NotFoundError quando findByIdForTenant retorna null", async () => {
      const repo = makeRepo(null);
      const useCase = new ResumeTimer(repo);

      await expect(useCase.execute(BASE_DTO)).rejects.toThrow(NotFoundError);
    });
  });

  // ----------------------------------------------------------------
  // Requirement 3.4 — apenas MECHANIC pode retomar
  // ----------------------------------------------------------------
  describe("cenário: role inválida", () => {
    it("deve lançar ForbiddenError quando userRole não é MECHANIC", async () => {
      const repo = makeRepo();
      const useCase = new ResumeTimer(repo);

      await expect(
        useCase.execute({ ...BASE_DTO, userRole: "ADMIN" })
      ).rejects.toThrow(ForbiddenError);
    });

    it("deve lançar ForbiddenError quando userRole é ATTENDANT", async () => {
      const repo = makeRepo();
      const useCase = new ResumeTimer(repo);

      await expect(
        useCase.execute({ ...BASE_DTO, userRole: "ATTENDANT" })
      ).rejects.toThrow(ForbiddenError);
    });
  });
});
