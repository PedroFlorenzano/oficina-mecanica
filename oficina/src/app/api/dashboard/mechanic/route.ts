import { NextResponse } from "next/server";
import { handleError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/infrastructure/database/prisma";

export async function GET() {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const userId = session.user.userId;

    const [assignedOrders, activeTimers, commissionSummary] = await Promise.all([
      prisma.serviceOrder.findMany({
        where: {
          tenantId,
          status: { notIn: ["DELIVERED", "CANCELLED"] },
          services: { some: { mechanicId: userId } },
        },
        select: {
          id: true, number: true, status: true, totalAmount: true, createdAt: true,
          client: { select: { name: true } },
          vehicle: { select: { plate: true, model: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),

      prisma.timerLog.findMany({
        where: {
          userId,
          finishedAt: null,
        },
        select: {
          id: true, startedAt: true, pausedAt: true, totalSeconds: true,
          orderService: {
            select: {
              description: true,
              order: { select: { number: true } },
            },
          },
        },
      }),

      prisma.commission.aggregate({
        where: { mechanicId: userId, tenantId, status: "PENDING" },
        _sum: { totalCommission: true },
        _count: true,
      }),
    ]);

    return NextResponse.json({
      assignedOrders,
      activeTimers,
      pendingCommissions: {
        count: commissionSummary._count,
        total: commissionSummary._sum.totalCommission || 0,
      },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return handleError(error);
  }
}
