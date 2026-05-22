import { PauseTimer } from "@/application/use-cases/timer/PauseTimer";
import { ITimerLogRepository, TimerLogData } from "@/domain/repositories/ITimerLogRepository";
import {
  BusinessRuleError,
  ForbiddenError,
  ValidationError,
  NotFoundError,
} from "@/domain/errors/DomainError";

// ---------- helpers ----------

function makeTimerLogData(overrides: Partial<TimerLogData> = {}): TimerLogData {
  return {
    id: "timer-log-1",
    startedAt: new Date(Date.now() - 60_000), // started 1 minute ago
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
  timerLog: TimerLogData | null = makeTimerLogData()
): jest.Mocked<ITimerLogRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findByIdForTenant: jest.fn().mockResolvedValue(timerLog),
    findActiveOrPausedByServiceAndUser: jest.fn(),
    findByOrderServiceId: jest.fn(),
    findByOrderId: jest.fn(),
    updateTotalSeconds: jest.fn(),
    updatePause: jest.fn().mockImplementation(
      async (id, pausedAt, pauseReason, totalSeconds) => ({
        ...makeTimerLogData(),
        id,
        pausedAt,
        pauseReason,
        totalSeconds,
      })
    ),
    updateFinish: jest.fn(),
    sumFinishedSeconds: jest.fn(),
    updateOrderServiceMinutes: jest.fn(),
    createAuditLog: jest.fn(),
  } as unknown as jest.Mocked<ITimerLogRepository>;
}

const BASE_DTO = {
  timerLogId: "timer-log-1",
  pauseReason: "Pausa para almoço",
  userId: "mechanic-user-1",
  tenantId: "tenant-1",
  userRole: "MECHANIC",
};

// ---------- tests ----------

describe("PauseTimer", () => {
  // ----------------------------------------------------------------
  // Happy path
  // ----------------------------------------------------------------
  describe("cenário feliz", () => {
    it("deve pausar o cronômetro ativo com sucesso e retornar o TimerLog atualizado", async () => {
      const repo = makeRepo();
      const useCase = new PauseTimer(repo);

      const result = await useCase.execute(BASE_DTO);

      expect(repo.findByIdForTenant).toHaveBeenCalledWith("timer-log-1", "tenant-1");
      expect(repo.updatePause).toHaveBeenCalledWith(
        "timer-log-1",
        expect.any(Date),
        "Pausa para almoço",
        expect.any(Number)
      );
      expect(result.pausedAt).toBeInstanceOf(Date);
      expect(result.pauseReason).toBe("Pausa para almoço");
    });
  });

  // ----------------------------------------------------------------
  // Requirement 2.4 — estado inválido: sessão já pausada
  // ----------------------------------------------------------------
  describe("cenário: pausar sessão já pausada", () => {
    it("deve lançar BusinessRuleError quando o TimerLog já está pausado (pausedAt preenchido)", async () => {
      const pausedLog = makeTimerLogData({ pausedAt: new Date() });
      const repo = makeRepo(pausedLog);
      const useCase = new PauseTimer(repo);

      await expect(useCase.execute(BASE_DTO)).rejects.toThrow(BusinessRuleError);
    });

    it("deve lançar BusinessRuleError quando o TimerLog já está finalizado (finishedAt preenchido)", async () => {
      const finishedLog = makeTimerLogData({ finishedAt: new Date() });
      const repo = makeRepo(finishedLog);
      const useCase = new PauseTimer(repo);

      await expect(useCase.execute(BASE_DTO)).rejects.toThrow(BusinessRuleError);
    });
  });

  // ----------------------------------------------------------------
  // Requirement 2.2 — validação de pauseReason
  // ----------------------------------------------------------------
  describe("cenário: pauseReason inválido", () => {
    it("deve lançar ValidationError quando pauseReason tem 2 caracteres", async () => {
      const repo = makeRepo();
      const useCase = new PauseTimer(repo);

      await expect(
        useCase.execute({ ...BASE_DTO, pauseReason: "ab" })
      ).rejects.toThrow(ValidationError);
    });

    it("deve lançar ValidationError quando pauseReason tem 256 caracteres", async () => {
      const longReason = "a".repeat(256);
      const repo = makeRepo();
      const useCase = new PauseTimer(repo);

      await expect(
        useCase.execute({ ...BASE_DTO, pauseReason: longReason })
      ).rejects.toThrow(ValidationError);
    });

    it("deve lançar ValidationError quando pauseReason está vazio", async () => {
      const repo = makeRepo();
      const useCase = new PauseTimer(repo);

      await expect(
        useCase.execute({ ...BASE_DTO, pauseReason: "" })
      ).rejects.toThrow(ValidationError);
    });

    it("deve aceitar pauseReason com exatamente 3 caracteres (limite inferior válido)", async () => {
      const repo = makeRepo();
      const useCase = new PauseTimer(repo);

      await expect(
        useCase.execute({ ...BASE_DTO, pauseReason: "abc" })
      ).resolves.toBeDefined();
    });

    it("deve aceitar pauseReason com exatamente 255 caracteres (limite superior válido)", async () => {
      const maxReason = "a".repeat(255);
      const repo = makeRepo();
      const useCase = new PauseTimer(repo);

      await expect(
        useCase.execute({ ...BASE_DTO, pauseReason: maxReason })
      ).resolves.toBeDefined();
    });
  });

  // ----------------------------------------------------------------
  // Requirement 2.5 — TimerLog não pertence ao userId
  // ----------------------------------------------------------------
  describe("cenário: TimerLog não pertence ao userId", () => {
    it("deve lançar ForbiddenError quando o TimerLog pertence a outro usuário", async () => {
      const otherUserLog = makeTimerLogData({ userId: "outro-mecanico" });
      const repo = makeRepo(otherUserLog);
      const useCase = new PauseTimer(repo);

      await expect(useCase.execute(BASE_DTO)).rejects.toThrow(ForbiddenError);
    });
  });

  // ----------------------------------------------------------------
  // Requirement 2.3 — TimerLog não encontrado (tenant mismatch / inexistente)
  // ----------------------------------------------------------------
  describe("cenário: TimerLog não encontrado", () => {
    it("deve lançar NotFoundError quando findByIdForTenant retorna null", async () => {
      const repo = makeRepo(null);
      const useCase = new PauseTimer(repo);

      await expect(useCase.execute(BASE_DTO)).rejects.toThrow(NotFoundError);
    });
  });

  // ----------------------------------------------------------------
  // Permissão — apenas MECHANIC pode pausar
  // ----------------------------------------------------------------
  describe("cenário: role inválida", () => {
    it("deve lançar ForbiddenError quando userRole não é MECHANIC", async () => {
      const repo = makeRepo();
      const useCase = new PauseTimer(repo);

      await expect(
        useCase.execute({ ...BASE_DTO, userRole: "ADMIN" })
      ).rejects.toThrow(ForbiddenError);
    });

    it("deve lançar ForbiddenError quando userRole é ATTENDANT", async () => {
      const repo = makeRepo();
      const useCase = new PauseTimer(repo);

      await expect(
        useCase.execute({ ...BASE_DTO, userRole: "ATTENDANT" })
      ).rejects.toThrow(ForbiddenError);
    });
  });
});
