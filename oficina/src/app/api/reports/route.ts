import { NextRequest, NextResponse } from "next/server";
import { handleError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/infrastructure/database/prisma";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso restrito a administradores" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const dateFilter: Prisma.DateTimeFilter = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate + "T23:59:59.999Z");
    const hasDateFilter = startDate || endDate;

    const orderWhere: Prisma.ServiceOrderWhereInput = { tenantId };
    if (hasDateFilter) orderWhere.createdAt = dateFilter;

    const [orders, completedOrders, cancelledCount, stockMovements] = await Promise.all([
      prisma.serviceOrder.findMany({
        where: orderWhere,
        select: { id: true, status: true, totalAmount: true, createdAt: true },
      }),
      prisma.serviceOrder.findMany({
        where: { ...orderWhere, status: { in: ["COMPLETED", "DELIVERED"] } },
        select: { totalAmount: true },
      }),
      prisma.serviceOrder.count({
        where: { ...orderWhere, status: "CANCELLED" },
      }),
      prisma.stockMovement.findMany({
        where: {
          stockItem: { tenantId },
          ...(hasDateFilter ? { createdAt: dateFilter } : {}),
        },
        select: { type: true, quantity: true, unitCost: true, stockItem: { select: { avgCost: true, sellPrice: true } } },
      }),
    ]);

    const totalOrders = orders.length;
    const totalRevenue = completedOrders.reduce((s, o) => s + o.totalAmount, 0);
    const avgTicket = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;

    // Custo de peças consumidas (usa unitCost gravado no momento do consumo, fallback para avgCost atual)
    const partsCost = stockMovements
      .filter(m => m.type === "CONSUMPTION")
      .reduce((s, m) => s + m.quantity * (m.unitCost ?? m.stockItem.avgCost), 0);

    // Faturamento por status
    const byStatus: Record<string, { count: number; total: number }> = {};
    for (const o of orders) {
      if (!byStatus[o.status]) byStatus[o.status] = { count: 0, total: 0 };
      byStatus[o.status].count++;
      byStatus[o.status].total += o.totalAmount;
    }

    // Faturamento por mês (últimos 6 meses)
    const monthly: { month: string; revenue: number; count: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const monthOrders = orders.filter(o => {
        const c = new Date(o.createdAt);
        return c >= d && c <= end && (o.status === "COMPLETED" || o.status === "DELIVERED");
      });
      monthly.push({
        month: d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
        revenue: monthOrders.reduce((s, o) => s + o.totalAmount, 0),
        count: monthOrders.length,
      });
    }

    const ordersWithCost = await prisma.serviceOrder.findMany({
      where: { ...orderWhere, status: { in: ["COMPLETED", "DELIVERED"] } },
      select: {
        id: true,
        number: true,
        totalAmount: true,
        createdAt: true,
        client: { select: { name: true } },
        vehicle: { select: { plate: true } },
        movements: {
          where: { type: "CONSUMPTION" },
          select: { quantity: true, unitCost: true, stockItem: { select: { avgCost: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const profitByOrder = ordersWithCost.map(o => {
      const cost = o.movements.reduce((s, m) => s + m.quantity * (m.unitCost ?? m.stockItem.avgCost), 0);
      return {
        id: o.id,
        number: o.number,
        client: o.client.name,
        plate: o.vehicle.plate,
        revenue: o.totalAmount,
        partsCost: cost,
        profit: o.totalAmount - cost,
        margin: o.totalAmount > 0 ? ((o.totalAmount - cost) / o.totalAmount) * 100 : 0,
        date: o.createdAt,
      };
    });

    return NextResponse.json({
      totalOrders,
      totalRevenue,
      avgTicket,
      partsCost,
      grossProfit: totalRevenue - partsCost,
      cancelledCount,
      completedCount: completedOrders.length,
      byStatus,
      monthly,
      profitByOrder,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return handleError(error);
  }
}
