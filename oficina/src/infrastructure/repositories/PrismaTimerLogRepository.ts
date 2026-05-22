import { prisma } from "../database/prisma";
import {
  ITimerLogRepository,
  TimerLogData,
  TimerServiceSummary,
  TimerAuditLogData,
} from "@/domain/repositories/ITimerLogRepository";

function toTimerLogData(raw: {
  id: string;
  startedAt: Date;
  pausedAt: Date | null;
  finishedAt: Date | null;
  pauseReason: string | null;
  totalSeconds: number;
  orderServiceId: string;
  userId: string;
  createdAt: Date;
}): TimerLogData {
  return {
    id: raw.id,
    startedAt: raw.startedAt,
    pausedAt: raw.pausedAt,
    finishedAt: raw.finishedAt,
    pauseReason: raw.pauseReason,
    totalSeconds: raw.totalSeconds,
    orderServiceId: raw.orderServiceId,
    userId: raw.userId,
    createdAt: raw.createdAt,
  };
}

function deriveStatus(logs: TimerLogData[]): TimerServiceSummary["status"] {
  if (logs.length === 0) return "sem sessão";
  if (logs.some((l) => l.finishedAt === null && l.pausedAt === null)) return "ativa";
  if (logs.some((l) => l.pausedAt !== null && l.finishedAt === null)) return "pausada";
  return "finalizada";
}

export class PrismaTimerLogRepository implements ITimerLogRepository {
  async create(data: Omit<TimerLogData, "id" | "createdAt">): Promise<TimerLogData> {
    const record = await prisma.timerLog.create({ data });
    return toTimerLogData(record);
  }

  async findById(id: string): Promise<TimerLogData | null> {
    const record = await prisma.timerLog.findUnique({ where: { id } });
    if (!record) return null;
    return toTimerLogData(record);
  }

  async findActiveOrPausedByServiceAndUser(
    orderServiceId: string,
    userId: string
  ): Promise<TimerLogData | null> {
    const record = await prisma.timerLog.findFirst({
      where: {
        orderServiceId,
        userId,
        finishedAt: null,
      },
    });
    if (!record) return null;
    return toTimerLogData(record);
  }

  async findByIdForTenant(id: string, tenantId: string): Promise<TimerLogData | null> {
    const record = await prisma.timerLog.findFirst({
      where: {
        id,
        orderService: {
          order: { tenantId },
        },
      },
    });
    if (!record) return null;
    return toTimerLogData(record);
  }

  async findByOrderServiceId(orderServiceId: string): Promise<TimerLogData[]> {
    const records = await prisma.timerLog.findMany({
      where: { orderServiceId },
      orderBy: { startedAt: "asc" },
    });
    return records.map(toTimerLogData);
  }

  async findByOrderId(orderId: string, tenantId: string): Promise<TimerServiceSummary[]> {
    const orderServices = await prisma.orderService.findMany({
      where: {
        orderId,
        order: { tenantId },
      },
      include: {
        timerLogs: { orderBy: { startedAt: "asc" } },
      },
      orderBy: { createdAt: "asc" },
    });

    // Batch-fetch mechanic names in a single query
    const mechanicIds = [
      ...new Set(
        orderServices
          .filter((os) => os.mechanicId !== null)
          .map((os) => os.mechanicId as string)
      ),
    ];

    const mechanics =
      mechanicIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: mechanicIds } },
            select: { id: true, name: true },
          })
        : [];

    const mechanicMap = new Map(mechanics.map((m) => [m.id, m.name]));

    return orderServices.map((os) => {
      const logs = os.timerLogs.map(toTimerLogData);

      const netSeconds = logs
        .filter((l) => l.finishedAt !== null)
        .reduce((sum, l) => sum + l.totalSeconds, 0);

      const status = deriveStatus(logs);

      const mechanicName = os.mechanicId ? (mechanicMap.get(os.mechanicId) ?? null) : null;

      return {
        orderServiceId: os.id,
        serviceDescription: os.description,
        mechanicName,
        netSeconds,
        status,
        logs,
      };
    });
  }

  async updateTotalSeconds(id: string, totalSeconds: number): Promise<TimerLogData> {
    const record = await prisma.timerLog.update({
      where: { id },
      data: { totalSeconds },
    });
    return toTimerLogData(record);
  }

  async updatePause(
    id: string,
    pausedAt: Date,
    pauseReason: string,
    totalSeconds: number
  ): Promise<TimerLogData> {
    const record = await prisma.timerLog.update({
      where: { id },
      data: { pausedAt, pauseReason, totalSeconds },
    });
    return toTimerLogData(record);
  }

  async updateFinish(id: string, finishedAt: Date, totalSeconds: number): Promise<TimerLogData> {
    const record = await prisma.timerLog.update({
      where: { id },
      data: { finishedAt, totalSeconds },
    });
    return toTimerLogData(record);
  }

  async sumFinishedSeconds(orderServiceId: string): Promise<number> {
    const result = await prisma.timerLog.aggregate({
      where: {
        orderServiceId,
        finishedAt: { not: null },
      },
      _sum: { totalSeconds: true },
    });
    return result._sum.totalSeconds ?? 0;
  }

  async updateOrderServiceMinutes(orderServiceId: string, timeMinutes: number): Promise<void> {
    await prisma.orderService.update({
      where: { id: orderServiceId },
      data: { timeMinutes },
    });
  }

  async createAuditLog(data: TimerAuditLogData): Promise<void> {
    await prisma.timerAuditLog.create({ data });
  }
}
