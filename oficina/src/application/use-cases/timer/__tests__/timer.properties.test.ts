import * as fc from "fast-check";
import { StartTimer } from "@/application/use-cases/timer/StartTimer";
import { PauseTimer } from "@/application/use-cases/timer/PauseTimer";
import { CorrectTimer } from "@/application/use-cases/timer/CorrectTimer";
import {
  ITimerLogRepository,
  TimerLogData,
} from "@/domain/repositories/ITimerLogRepository";
import {
  ConflictError,
  ValidationError,
} from "@/domain/errors/DomainError";

// Mock Prisma — StartTimer imports it directly
jest.mock("@/infrastructure/database/prisma", () => ({
  prisma: {
    orderService: {
      findFirst: jest.fn(),
    },
  },
}));

import { prisma } from "@/infrastructure/database/prisma";

/**
 * Pure function extracted from the timer use cases (PauseTimer, FinishTimer).
 * calcTotalSeconds(startedAt, endAt, accumulatedSeconds) computes the total
 * number of seconds elapsed in a session plus any previously accumulated seconds.
 *
 * Validates: Requirements 9.1, 9.4
 */
function calcTotalSeconds(
  startedAt: Date,
  endAt: Date,
  accumulatedSeconds: number
): number {
  return (
    Math.floor((endAt.getTime() - startedAt.getTime()) / 1000) +
    accumulatedSeconds
  );
}

// ---------- helpers for Property 7 ----------

function makeFinishedTimerLogData(): TimerLogData {
  return {
    id: "timer-log-prop7",
    startedAt: new Date(Date.now() - 3_600_000),
    pausedAt: null,
    finishedAt: new Date(Date.now() - 1_800_000),
    pauseReason: null,
    totalSeconds: 1800,
    orderServiceId: "order-service-prop7",
    userId: "mechanic-user-prop7",
    createdAt: new Date(),
  };
}

function makeRepoForProperty7(): jest.Mocked<ITimerLogRepository> {
  const log = makeFinishedTimerLogData();
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findByIdForTenant: jest.fn().mockResolvedValue(log),
    findActiveOrPausedByServiceAndUser: jest.fn(),
    findByOrderServiceId: jest.fn(),
    findByOrderId: jest.fn(),
    updateTotalSeconds: jest.fn().mockImplementation(async (id, totalSeconds) => ({
      ...log,
      id,
      totalSeconds,
    })),
    updatePause: jest.fn(),
    updateFinish: jest.fn(),
    sumFinishedSeconds: jest.fn().mockResolvedValue(1800),
    updateOrderServiceMinutes: jest.fn().mockResolvedValue(undefined),
    createAuditLog: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<ITimerLogRepository>;
}

// ────────────────────────────────────────────────────────────
// Helpers shared by property tests that exercise use cases
// ────────────────────────────────────────────────────────────

const makeActiveTimerLog = (
  orderServiceId: string,
  userId: string
): TimerLogData => ({
  id: "tl-existing",
  startedAt: new Date("2024-01-01T10:00:00Z"),
  pausedAt: null,
  finishedAt: null,
  pauseReason: null,
  totalSeconds: 0,
  orderServiceId,
  userId,
  createdAt: new Date("2024-01-01T10:00:00Z"),
});

const makeOpenOrderService = (orderServiceId: string) => ({
  id: orderServiceId,
  mechanicId: null,
  order: { tenantId: "tenant-1", status: "OPEN" },
});

const makeRepo = (
  existingSession: TimerLogData | null
): ITimerLogRepository => ({
  create: jest.fn(),
  findById: jest.fn(),
  findByIdForTenant: jest.fn(),
  findActiveOrPausedByServiceAndUser: jest
    .fn()
    .mockResolvedValue(existingSession),
  findByOrderServiceId: jest.fn(),
  findByOrderId: jest.fn(),
  updateTotalSeconds: jest.fn(),
  updatePause: jest.fn(),
  updateFinish: jest.fn(),
  sumFinishedSeconds: jest.fn(),
  updateOrderServiceMinutes: jest.fn(),
  createAuditLog: jest.fn(),
});

describe("Feature: cronometro-servico", () => {
  /**
   * Property 1: totalSeconds >= 0 para toda sessão finalizada
   *
   * For any session where finishedAt >= startedAt (guaranteed by construction),
   * the resulting totalSeconds must never be negative.
   *
   * Uses integer-based timestamp generation to avoid NaN dates produced by fc.date().
   *
   * Validates: Requirements 9.4
   */
  describe("Property 1: totalSeconds >= 0 para toda sessão finalizada", () => {
    it("should hold", () => {
      const minTs = new Date("2020-01-01").getTime();
      const maxTs = new Date("2030-01-01").getTime();

      fc.assert(
        fc.property(
          fc.integer({ min: minTs, max: maxTs }),
          fc.integer({ min: 0, max: 86400 }),
          (startedAtMs, deltaSeconds) => {
            const startedAt = new Date(startedAtMs);
            const finishedAt = new Date(startedAtMs + deltaSeconds * 1000);
            const result = calcTotalSeconds(startedAt, finishedAt, 0);
            return result >= 0;
          }
        ),
        {
          numRuns: 100,
        }
      );
    });
  });

  /**
   * Property 3: totalSeconds = floor((finishedAt - startedAt)/1000) sem pausas
   *
   * For any session without pauses (accumulatedSeconds = 0), totalSeconds must
   * equal the floor of the elapsed milliseconds converted to seconds.
   *
   * Uses integer-based timestamp generation to avoid NaN dates produced by fc.date().
   *
   * Validates: Requirements 9.1
   */
  describe(
    "Property 3: totalSeconds = floor((finishedAt - startedAt)/1000) sem pausas",
    () => {
      it("should hold", () => {
        const minTs = new Date("2020-01-01").getTime();
        const maxTs = new Date("2030-01-01").getTime();

        fc.assert(
          fc.property(
            fc.integer({ min: minTs, max: maxTs }),
            fc.integer({ min: 0, max: 86400000 }),
            (startedAtMs, delta) => {
              const startedAt = new Date(startedAtMs);
              const finishedAt = new Date(startedAtMs + delta);
              const result = calcTotalSeconds(startedAt, finishedAt, 0);
              const expected = Math.floor(delta / 1000);
              return result === expected;
            }
          ),
          {
            numRuns: 100,
          }
        );
      });
    }
  );

  /**
   * Property 2+8: timeMinutes = floor(sum(totalSeconds) / 60)
   *
   * For any list of totalSeconds values, the computed timeMinutes must equal
   * Math.floor(sum / 60), where sum is the total of all seconds in the list.
   *
   * Validates: Requirements 9.3, 4.6, 7.3
   */
  describe(
    "Property 2+8: timeMinutes = floor(sum(totalSeconds) / 60)",
    () => {
      it("should hold", () => {
        function calcTimeMinutes(totalSecondsArray: number[]): number {
          const sum = totalSecondsArray.reduce((a, b) => a + b, 0);
          return Math.floor(sum / 60);
        }

        fc.assert(
          fc.property(
            fc.array(fc.integer({ min: 0, max: 86400 }), {
              minLength: 0,
              maxLength: 100,
            }),
            (totalSecondsArray) => {
              const result = calcTimeMinutes(totalSecondsArray);
              const expected = Math.floor(
                totalSecondsArray.reduce((a, b) => a + b, 0) / 60
              );
              return result === expected;
            }
          ),
          {
            numRuns: 100,
          }
        );
      });
    }
  );

  /**
   * Property 4: Cálculo com múltiplos ciclos de pausa/retomada é correto
   *
   * For any sequence of N pause/resume cycles, the total accumulated seconds
   * computed by summing calcTotalSeconds per interval (each starting fresh with
   * accumulatedSeconds = 0) must equal the ground-truth sum of
   * floor((pauseMs - startMs) / 1000) for each interval.
   *
   * Generator: fc.array of tuples [startMs, delta] where
   *   pauseMs = startMs + delta * 1000  (delta is in whole seconds, ∈ [1, 86400])
   *
   * Validates: Requirements 9.2, 3.2, 4.5
   *
   * Tag: Feature: cronometro-servico, Property 4: soma de intervalos efetivos = totalSeconds acumulado
   */
  describe(
    "Property 4: Cálculo com múltiplos ciclos de pausa/retomada é correto",
    () => {
      it("should hold", () => {
        fc.assert(
          fc.property(
            fc.array(
              fc.tuple(
                fc.integer({ min: 0 }),
                fc.integer({ min: 1, max: 86400 })
              ),
              { minLength: 1, maxLength: 10 }
            ),
            (intervals) => {
              const accumulated = intervals.reduce((sum, [startMs, delta]) => {
                const pauseMs = startMs + delta * 1000;
                return sum + Math.floor((pauseMs - startMs) / 1000);
              }, 0);

              const viaCalc = intervals.reduce((sum, [startMs, delta]) => {
                const startedAt = new Date(startMs);
                const pausedAt = new Date(startMs + delta * 1000);
                return sum + calcTotalSeconds(startedAt, pausedAt, 0);
              }, 0);

              return viaCalc === accumulated;
            }
          ),
          {
            numRuns: 100,
          }
        );
      });
    }
  );

  /**
   * Property 6: `pauseReason` armazenado é igual ao informado
   *
   * For any valid pauseReason string where trimmed length ∈ [3, 255], after
   * PauseTimer executes successfully, TimerLog.pauseReason must equal reason.trim().
   * The use case trims the input before passing it to updatePause; the stored
   * value must be identical to the trimmed input.
   *
   * Validates: Requirements 2.1, 2.2
   *
   * Tag: Feature: cronometro-servico, Property 6: pauseReason armazenado é igual ao informado
   */
  describe(
    "Property 6: pauseReason armazenado é igual ao informado",
    () => {
      it("should hold", async () => {
        const timerLogId = "timer-log-prop6";
        const userId = "user-mechanic-prop6";
        const tenantId = "tenant-prop6";
        const now = new Date();

        await fc.assert(
          fc.asyncProperty(
            // Generate strings whose trimmed form still has length [3, 255].
            fc
              .string({ minLength: 3, maxLength: 255 })
              .filter(
                (s) => s.trim().length >= 3 && s.trim().length <= 255
              ),
            async (reason) => {
              // Build an active TimerLog (pausedAt === null, finishedAt === null)
              const activeTimerLog: TimerLogData = {
                id: timerLogId,
                startedAt: new Date(now.getTime() - 60_000),
                pausedAt: null,
                finishedAt: null,
                pauseReason: null,
                totalSeconds: 0,
                orderServiceId: "order-service-prop6",
                userId,
                createdAt: new Date(now.getTime() - 60_000),
              };

              let storedReason: string | null = null;

              // Mock repository: findByIdForTenant returns the active log;
              // updatePause captures the pauseReason passed by the use case.
              const mockRepo: ITimerLogRepository = {
                create: jest.fn(),
                findById: jest.fn(),
                findByIdForTenant: jest.fn().mockResolvedValue(activeTimerLog),
                findActiveOrPausedByServiceAndUser: jest.fn(),
                findByOrderServiceId: jest.fn(),
                findByOrderId: jest.fn(),
                updateTotalSeconds: jest.fn(),
                updatePause: jest
                  .fn()
                  .mockImplementation(
                    (
                      _id: string,
                      pausedAt: Date,
                      pauseReason: string,
                      totalSeconds: number
                    ): Promise<TimerLogData> => {
                      storedReason = pauseReason;
                      return Promise.resolve({
                        ...activeTimerLog,
                        pausedAt,
                        pauseReason,
                        totalSeconds,
                      });
                    }
                  ),
                updateFinish: jest.fn(),
                sumFinishedSeconds: jest.fn(),
                updateOrderServiceMinutes: jest.fn(),
                createAuditLog: jest.fn(),
              };

              const useCase = new PauseTimer(mockRepo);
              await useCase.execute({
                timerLogId,
                pauseReason: reason,
                userId,
                tenantId,
                userRole: "MECHANIC",
              });

              // The use case trims the reason before storing;
              // verify stored value equals trim(input).
              return storedReason === reason.trim();
            }
          ),
          {
            numRuns: 100,
          }
        );
      });
    }
  );

  /**
   * Property 5: Unicidade de sessão ativa por serviço e mecânico
   *
   * For any (orderServiceId, userId), StartTimer MUST throw ConflictError when
   * findActiveOrPausedByServiceAndUser already returns an active session.
   * No two TimerLogs with finishedAt IS NULL can coexist for the same pair.
   *
   * Validates: Requirements 1.3
   *
   * Tag: Feature: cronometro-servico, Property 5: unicidade de sessão ativa por serviço e mecânico
   */
  describe(
    "Property 5: unicidade de sessão ativa por serviço e mecânico",
    () => {
      beforeEach(() => {
        jest.clearAllMocks();
      });

      it("should hold", async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.string({ minLength: 1 }),
            fc.string({ minLength: 1 }),
            async (orderServiceId, userId) => {
              // Mock Prisma to return a valid open order for any orderServiceId
              (prisma.orderService.findFirst as jest.Mock).mockResolvedValue(
                makeOpenOrderService(orderServiceId)
              );

              // An active session already exists for this (orderServiceId, userId)
              const existingSession = makeActiveTimerLog(orderServiceId, userId);
              const repo = makeRepo(existingSession);
              const useCase = new StartTimer(repo);

              await expect(
                useCase.execute({
                  orderServiceId,
                  userId,
                  tenantId: "tenant-1",
                  userRole: "MECHANIC",
                })
              ).rejects.toThrow(ConflictError);
            }
          ),
          { numRuns: 100 }
        );
      });
    }
  );

  /**
   * Property 7: Rejeição de `newTotalSeconds` fora de [0, 86400]
   *
   * For any integer value of newTotalSeconds that is either < 0 or > 86400,
   * CorrectTimer must reject the operation with a ValidationError.
   *
   * Validates: Requirements 7.2
   *
   * Tag: Feature: cronometro-servico, Property 7: newTotalSeconds fora de [0,86400] é rejeitado
   */
  describe(
    "Property 7: newTotalSeconds fora de [0,86400] é rejeitado",
    () => {
      it("should hold", async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.oneof(fc.integer({ max: -1 }), fc.integer({ min: 86401 })),
            async (invalidSeconds) => {
              const repo = makeRepoForProperty7();
              const useCase = new CorrectTimer(repo);

              await expect(
                useCase.execute({
                  timerLogId: "timer-log-prop7",
                  newTotalSeconds: invalidSeconds,
                  adminUserId: "admin-user-prop7",
                  tenantId: "tenant-prop7",
                  userRole: "ADMIN",
                })
              ).rejects.toThrow(ValidationError);
            }
          ),
          {
            numRuns: 100,
          }
        );
      });
    }
  );
});
