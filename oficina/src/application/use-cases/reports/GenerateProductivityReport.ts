import { PrismaClient } from "@prisma/client";
import { ForbiddenError } from "@/domain/errors/DomainError";

interface MechanicProductivity {
  id: string;
  name: string;
  serviceCount: number;
  totalSeconds: number;
  avgSeconds: number;
  avgEstimatedSeconds: number;
  servicesWithEstimate: number;
  withinEstimate: number;
  withinPct: number;
}

export class GenerateProductivityReport {
  constructor(private readonly db: PrismaClient) {}

  async execute(tenantId: string, role: string): Promise<{ ranking: MechanicProductivity[] }> {
    if (role !== "ADMIN") {
      throw new ForbiddenError("Acesso restrito a administradores");
    }

    const mechanics = await this.db.user.findMany({
      where: { tenantId, role: "MECHANIC", active: true },
      select: { id: true, name: true },
    });

    const timerLogs = await this.db.timerLog.findMany({
      where: {
        finishedAt: { not: null },
        orderService: { order: { tenantId } },
        userId: { in: mechanics.map((m) => m.id) },
      },
      select: {
        userId: true,
        totalSeconds: true,
        orderService: {
          select: { id: true, timeMinutes: true },
        },
      },
    });

    // Aggregate by (userId, orderServiceId)
    const serviceAgg = new Map<string, { userId: string; totalSeconds: number; estimatedMinutes: number | null }>();

    for (const log of timerLogs) {
      const key = `${log.userId}:${log.orderService.id}`;
      const existing = serviceAgg.get(key);
      if (existing) {
        existing.totalSeconds += log.totalSeconds;
      } else {
        serviceAgg.set(key, {
          userId: log.userId,
          totalSeconds: log.totalSeconds,
          estimatedMinutes: log.orderService.timeMinutes,
        });
      }
    }

    // Build stats per mechanic
    const ranking = mechanics.map((m) => {
      const entries = Array.from(serviceAgg.values()).filter((a) => a.userId === m.id);
      const serviceCount = entries.length;
      const totalAppointed = entries.reduce((s, e) => s + e.totalSeconds, 0);
      const avgSeconds = serviceCount > 0 ? Math.round(totalAppointed / serviceCount) : 0;

      let totalEstimated = 0;
      let servicesWithEstimate = 0;
      let withinEstimate = 0;

      for (const entry of entries) {
        if (entry.estimatedMinutes && entry.estimatedMinutes > 0) {
          const estimatedSec = entry.estimatedMinutes * 60;
          totalEstimated += estimatedSec;
          servicesWithEstimate++;
          if (entry.totalSeconds <= estimatedSec) withinEstimate++;
        }
      }

      const avgEstimatedSeconds = servicesWithEstimate > 0 ? Math.round(totalEstimated / servicesWithEstimate) : 0;
      const withinPct = servicesWithEstimate > 0 ? Math.round((withinEstimate / servicesWithEstimate) * 100) : 0;

      return {
        id: m.id,
        name: m.name,
        serviceCount,
        totalSeconds: totalAppointed,
        avgSeconds,
        avgEstimatedSeconds,
        servicesWithEstimate,
        withinEstimate,
        withinPct,
      };
    }).sort((a, b) => b.withinPct - a.withinPct || b.serviceCount - a.serviceCount);

    return { ranking };
  }
}
