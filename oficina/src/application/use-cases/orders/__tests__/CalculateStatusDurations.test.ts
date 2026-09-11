import { CalculateStatusDurations } from "@/application/use-cases/orders/CalculateStatusDurations";
import { IServiceOrderRepository, StatusHistoryEntry } from "@/domain/repositories/IServiceOrderRepository";
import { ForbiddenError, NotFoundError } from "@/domain/errors/DomainError";

const HOUR = 60 * 60 * 1000;

describe("CalculateStatusDurations.compute (item 24)", () => {
  it("soma o tempo em cada status a partir de datas fixas", () => {
    const history: StatusHistoryEntry[] = [
      { fromStatus: null, toStatus: "WAITING_APPROVAL", createdAt: new Date("2026-01-01T08:00:00Z") },
      { fromStatus: "WAITING_APPROVAL", toStatus: "IN_PROGRESS", createdAt: new Date("2026-01-01T10:00:00Z") },
      { fromStatus: "IN_PROGRESS", toStatus: "COMPLETED", createdAt: new Date("2026-01-01T15:00:00Z") },
    ];
    const now = new Date("2026-01-01T18:00:00Z");

    const result = CalculateStatusDurations.compute(history, now);

    expect(result).toEqual([
      { status: "WAITING_APPROVAL", durationMs: 2 * HOUR, current: false },
      { status: "IN_PROGRESS", durationMs: 5 * HOUR, current: false },
      { status: "COMPLETED", durationMs: 3 * HOUR, current: true },
    ]);
  });

  it("o último status conta até agora", () => {
    const history: StatusHistoryEntry[] = [
      { fromStatus: null, toStatus: "OPEN", createdAt: new Date("2026-02-10T09:00:00Z") },
    ];
    const now = new Date("2026-02-10T12:30:00Z");

    const result = CalculateStatusDurations.compute(history, now);

    expect(result).toEqual([
      { status: "OPEN", durationMs: 3.5 * HOUR, current: true },
    ]);
  });

  it("acumula quando o mesmo status ocorre mais de uma vez", () => {
    const history: StatusHistoryEntry[] = [
      { fromStatus: null, toStatus: "IN_PROGRESS", createdAt: new Date("2026-03-01T08:00:00Z") },
      { fromStatus: "IN_PROGRESS", toStatus: "WAITING_PART", createdAt: new Date("2026-03-01T09:00:00Z") },
      { fromStatus: "WAITING_PART", toStatus: "IN_PROGRESS", createdAt: new Date("2026-03-01T11:00:00Z") },
    ];
    const now = new Date("2026-03-01T12:00:00Z");

    const result = CalculateStatusDurations.compute(history, now);

    // IN_PROGRESS: 1h (08→09) + 1h (11→12) = 2h; WAITING_PART: 2h (09→11)
    const inProgress = result.find((r) => r.status === "IN_PROGRESS");
    const waitingPart = result.find((r) => r.status === "WAITING_PART");
    expect(inProgress?.durationMs).toBe(2 * HOUR);
    expect(waitingPart?.durationMs).toBe(2 * HOUR);
    expect(inProgress?.current).toBe(true);
  });

  it("ignora entradas de auditoria (fromStatus == toStatus)", () => {
    const history: StatusHistoryEntry[] = [
      { fromStatus: null, toStatus: "IN_PROGRESS", createdAt: new Date("2026-04-01T08:00:00Z") },
      // edição registrada — não abre novo intervalo
      { fromStatus: "IN_PROGRESS", toStatus: "IN_PROGRESS", createdAt: new Date("2026-04-01T09:00:00Z") },
      { fromStatus: "IN_PROGRESS", toStatus: "COMPLETED", createdAt: new Date("2026-04-01T10:00:00Z") },
    ];
    const now = new Date("2026-04-01T11:00:00Z");

    const result = CalculateStatusDurations.compute(history, now);

    expect(result).toEqual([
      { status: "IN_PROGRESS", durationMs: 2 * HOUR, current: false },
      { status: "COMPLETED", durationMs: 1 * HOUR, current: true },
    ]);
  });

  it("retorna vazio quando não há histórico", () => {
    expect(CalculateStatusDurations.compute([], new Date())).toEqual([]);
  });
});

describe("CalculateStatusDurations.execute — restrição de admin", () => {
  const makeRepo = (): IServiceOrderRepository => ({
    findById: jest.fn().mockResolvedValue({ id: "order-1", tenantId: "tenant-1" }),
    getStatusHistory: jest.fn().mockResolvedValue([
      { fromStatus: null, toStatus: "OPEN", createdAt: new Date("2026-01-01T08:00:00Z") },
    ]),
  } as unknown as IServiceOrderRepository);

  it("lança ForbiddenError para não-admin", async () => {
    const useCase = new CalculateStatusDurations(makeRepo());
    await expect(
      useCase.execute("order-1", "tenant-1", "MECHANIC")
    ).rejects.toThrow(ForbiddenError);
  });

  it("permite para admin", async () => {
    const useCase = new CalculateStatusDurations(makeRepo());
    const result = await useCase.execute("order-1", "tenant-1", "ADMIN", new Date("2026-01-01T10:00:00Z"));
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ status: "OPEN", current: true });
  });

  it("lança NotFoundError se a OS for de outro tenant", async () => {
    const useCase = new CalculateStatusDurations(makeRepo());
    await expect(
      useCase.execute("order-1", "outro-tenant", "ADMIN")
    ).rejects.toThrow(NotFoundError);
  });
});
