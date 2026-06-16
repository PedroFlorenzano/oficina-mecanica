import { NextResponse } from "next/server";
import { handleError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";
import { withTenant } from "@/infrastructure/database/prisma";

export async function GET() {
  try {
    const session = await requireAuth();
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
    }
    const tenantId = session.user.tenantId;
    const prisma = withTenant(tenantId);

    // Buscar todos os mecânicos
    const mechanics = await prisma.user.findMany({
      where: { tenantId, role: "MECHANIC", active: true },
      select: { id: true, name: true },
    });

    // Buscar todos os timer logs finalizados agrupados por mecânico
    const timerLogs = await prisma.timerLog.findMany({
      where: {
        finishedAt: { not: null },
        orderService: { order: { tenantId } },
        userId: { in: mechanics.map((m) => m.id) },
      },
      select: {
        userId: true,
        totalSeconds: true,
        orderService: {
          select: {
            id: true,
            timeMinutes: true,
            description: true,
          },
        },
      },
    });

    // Agregar por mecânico e por serviço
    const mechanicStats = new Map<string, {
      totalServices: Set<string>;
      totalAppointed: number;
      totalEstimated: number;
      servicesWithEstimate: number;
      withinEstimate: number;
    }>();

    for (const m of mechanics) {
      mechanicStats.set(m.id, { totalServices: new Set(), totalAppointed: 0, totalEstimated: 0, servicesWithEstimate: 0, withinEstimate: 0 });
    }

    // Agrupar logs por (userId, orderServiceId) para somar totalSeconds por serviço
    const serviceAgg = new Map<string, { userId: string; totalSeconds: number; estimatedMinutes: number | null }>();

    for (const log of timerLogs) {
      const key = `${log.userId}:${log.orderService.id}`;
      const existing = serviceAgg.get(key);
      if (existing) {
        existing.totalSeconds += log.totalSeconds;
      } else {
        serviceAgg.set(key, { userId: log.userId, totalSeconds: log.totalSeconds, estimatedMinutes: log.orderService.timeMinutes });
      }
    }

    for (const [, agg] of serviceAgg) {
      const stats = mechanicStats.get(agg.userId);
      if (!stats) continue;
      stats.totalServices.add(agg.userId); // just counting
      stats.totalAppointed += agg.totalSeconds;
      if (agg.estimatedMinutes && agg.estimatedMinutes > 0) {
        const estimatedSec = agg.estimatedMinutes * 60;
        stats.totalEstimated += estimatedSec;
        stats.servicesWithEstimate++;
        if (agg.totalSeconds <= estimatedSec) stats.withinEstimate++;
      }
    }

    // Montar resposta
    const ranking = mechanics.map((m) => {
      const stats = mechanicStats.get(m.id)!;
      const serviceCount = Array.from(serviceAgg.values()).filter((a) => a.userId === m.id).length;
      const avgSeconds = serviceCount > 0 ? Math.round(stats.totalAppointed / serviceCount) : 0;
      const avgEstimatedSeconds = stats.servicesWithEstimate > 0 ? Math.round(stats.totalEstimated / stats.servicesWithEstimate) : 0;
      const withinPct = stats.servicesWithEstimate > 0 ? Math.round((stats.withinEstimate / stats.servicesWithEstimate) * 100) : 0;

      return {
        id: m.id,
        name: m.name,
        serviceCount,
        totalSeconds: stats.totalAppointed,
        avgSeconds,
        avgEstimatedSeconds,
        servicesWithEstimate: stats.servicesWithEstimate,
        withinEstimate: stats.withinEstimate,
        withinPct,
      };
    }).sort((a, b) => b.withinPct - a.withinPct || b.serviceCount - a.serviceCount);

    return NextResponse.json({ ranking });
  } catch (error) {
    return handleError(error);
  }
}
