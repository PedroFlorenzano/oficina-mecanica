import { FinishTimer } from "@/application/use-cases/timer/FinishTimer";
import { ITimerLogRepository, TimerLogData } from "@/domain/repositories/ITimerLogRepository";
import {
  BusinessRuleError,
  ForbiddenError,
  NotFoundError,
} from "@/domain/errors/DomainError";

// ---------- helpers ----------

function makeTimerLogData(overrides: Partial<TimerLogData> = {}): TimerLogData {
  return {
    id: "timer-log-1",
    startedAt: new Date(Date.now() - 120_000), // started 2 minutes ago
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
  timerLog: TimerLogData | null = makeTimerLogData(),
  sumSeconds = 300
): jest.Mocked<ITimerLogRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findByIdForTenant: jest.fn().mockResolvedValue(timerLog),
    findActiveOrPausedByServiceAndUser: jest.fn(),
    findByOrderServiceId: jest.fn(),
    findByOrderId: jest.fn(),
    updateTotalSeconds: jest.fn(),
    updatePause: jest.fn(),
    updateFinish: jest.fn().mockImplementation(
      async (id, finishedAt, totalSeconds) => ({
        ...makeTimerLogData(),
        id,
        finishedAt,
        totalSeconds,
      })
    ),
    sumFinishedSeconds: jest.fn().mockResolvedValue(sumSeconds),
    updateOrderServiceMinutes: jest.fn().mockResolvedValue(undefined),
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

describe("FinishTimer", () => {
  // ----------------------------------------------------------------
  // Happy path
  // ----------------------------------------------------------------
  describe("cenário feliz", () => {
    it("deve finalizar o cronômetro ativo com sucesso e retornar o TimerLog atualizado", async () => {
      const repo = makeRepo();
      const useCase = new FinishTimer(repo);

      const result = await useCase.execute(BASE_DTO);

      expect(repo.findByIdForTenant).toHaveBeenCalledWith("timer-log-1", "tenant-1");
      expect(repo.updateFinish).toHaveBeenCalledWith(
        "timer-log-1",
        expect.any(Date),
        expect.any(Number)
      );
      expect(result.finishedAt).toBeInstanceOf(Date);
    });

    // Requirement 4.6 — timeMinutes do OrderService deve ser atualizado
    it("deve chamar sumFinishedSeconds com o orderServiceId correto", async () => {
      const repo = makeRepo(makeTimerLogData(), 300);
      const useCase = new FinishTimer(repo);

      await useCase.execute(BASE_DTO);

      expect(repo.sumFinishedSeconds).toHaveBeenCalledWith("order-service-1");
    });

    it("deve chamar updateOrderServiceMinutes com floor(sumSeconds / 60)", async () => {
      const sumSeconds = 300; // 5 minutes exactly
      const repo = makeRepo(makeTimerLogData(), sumSeconds);
      const useCase = new FinishTimer(repo);

      await useCase.execute(BASE_DTO);

      const expectedMinutes = Math.floor(sumSeconds / 60); // 5
      expect(repo.updateOrderServiceMinutes).toHaveBeenCalledWith(
        "order-service-1",
        expectedMinutes
      );
    });

    it("deve calcular timeMinutes corretamente com segundos não divisíveis por 60 (truncamento)", async () => {
      const sumSeconds = 370; // 6 min 10 s → floor = 6
      const repo = makeRepo(makeTimerLogData(), sumSeconds);
      const useCase = new FinishTimer(repo);

      await useCase.execute(BASE_DTO);

      expect(repo.updateOrderServiceMinutes).toHaveBeenCalledWith(
        "order-service-1",
        Math.floor(sumSeconds / 60) // 6
      );
    });
  });

  // ----------------------------------------------------------------
  // Requirement 4.2 — estado inválido: sessão pausada
  // ----------------------------------------------------------------
  describe("cenário: finalizar sessão pausada", () => {
    it("deve lançar BusinessRuleError quando o TimerLog está pausado (pausedAt preenchido)", async () => {
      const pausedLog = makeTimerLogData({ pausedAt: new Date() });
      const repo = makeRepo(pausedLog);
      const useCase = new FinishTimer(repo);

      await expect(useCase.execute(BASE_DTO)).rejects.toThrow(BusinessRuleError);
    });

    it("deve lançar BusinessRuleError quando o TimerLog já está finalizado (finishedAt preenchido)", async () => {
      const finishedLog = makeTimerLogData({ finishedAt: new Date() });
      const repo = makeRepo(finishedLog);
      const useCase = new FinishTimer(repo);

      await expect(useCase.execute(BASE_DTO)).rejects.toThrow(BusinessRuleError);
    });
  });

  // ----------------------------------------------------------------
  // Requirement 4.3 — TimerLog não pertence ao userId
  // ----------------------------------------------------------------
  describe("cenário: TimerLog não pertence ao userId", () => {
    it("deve lançar ForbiddenError quando o TimerLog pertence a outro usuário", async () => {
      const otherUserLog = makeTimerLogData({ userId: "outro-mecanico" });
      const repo = makeRepo(otherUserLog);
      const useCase = new FinishTimer(repo);

      await expect(useCase.execute(BASE_DTO)).rejects.toThrow(ForbiddenError);
    });
  });

  // ----------------------------------------------------------------
  // Requirement 4.1 — TimerLog não encontrado (tenant mismatch / inexistente)
  // ----------------------------------------------------------------
  describe("cenário: TimerLog não encontrado", () => {
    it("deve lançar NotFoundError quando findByIdForTenant retorna null", async () => {
      const repo = makeRepo(null);
      const useCase = new FinishTimer(repo);

      await expect(useCase.execute(BASE_DTO)).rejects.toThrow(NotFoundError);
    });
  });

  // ----------------------------------------------------------------
  // Permissão — apenas MECHANIC pode finalizar
  // ----------------------------------------------------------------
  describe("cenário: role inválida", () => {
    it("deve lançar ForbiddenError quando userRole é ADMIN", async () => {
      const repo = makeRepo();
      const useCase = new FinishTimer(repo);

      await expect(
        useCase.execute({ ...BASE_DTO, userRole: "ADMIN" })
      ).rejects.toThrow(ForbiddenError);
    });

    it("deve lançar ForbiddenError quando userRole é ATTENDANT", async () => {
      const repo = makeRepo();
      const useCase = new FinishTimer(repo);

      await expect(
        useCase.execute({ ...BASE_DTO, userRole: "ATTENDANT" })
      ).rejects.toThrow(ForbiddenError);
    });
  });
});
