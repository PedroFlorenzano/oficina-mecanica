import { NextRequest, NextResponse } from "next/server";
import { handleError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { ReportDocument } from "@/components/pdf/ReportDocument";
import { prisma } from "@/infrastructure/database/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
    }
    const tenantId = session.user.tenantId;
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const dateFilter: Record<string, unknown> = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate + "T23:59:59.999Z");
    const where = { tenantId, ...(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {}) };

    const orders = await prisma.serviceOrder.findMany({
      where,
      include: {
        client: { select: { name: true } },
        vehicle: { select: { plate: true } },
        parts: { include: { stockItem: { select: { avgCost: true } } } },
      },
    });

    const totalOrders = orders.length;
    const totalRevenue = orders.filter(o => o.status !== "CANCELLED").reduce((s, o) => s + o.totalAmount, 0);
    const completedCount = orders.filter(o => ["COMPLETED", "DELIVERED"].includes(o.status)).length;
    const cancelledCount = orders.filter(o => o.status === "CANCELLED").length;
    const avgTicket = completedCount > 0 ? totalRevenue / completedCount : 0;

    let partsCost = 0;
    const profitByOrder = orders
      .filter(o => ["COMPLETED", "DELIVERED"].includes(o.status))
      .map(o => {
        const cost = o.parts.reduce((s, p) => s + p.quantity * (p.stockItem?.avgCost ?? p.unitPrice), 0);
        partsCost += cost;
        const profit = o.totalAmount - cost;
        return { number: o.number, client: o.client.name, plate: o.vehicle.plate, revenue: o.totalAmount, partsCost: cost, profit, margin: o.totalAmount > 0 ? (profit / o.totalAmount) * 100 : 0 };
      });

    // Monthly
    const monthMap = new Map<string, { revenue: number; count: number }>();
    for (const o of orders.filter(o => o.status !== "CANCELLED")) {
      const key = `${o.createdAt.getFullYear()}-${String(o.createdAt.getMonth() + 1).padStart(2, "0")}`;
      const cur = monthMap.get(key) || { revenue: 0, count: 0 };
      cur.revenue += o.totalAmount;
      cur.count++;
      monthMap.set(key, cur);
    }
    const monthly = [...monthMap.entries()].sort().slice(-6).map(([month, d]) => ({ month, ...d }));

    const period = startDate && endDate ? `${new Date(startDate).toLocaleDateString("pt-BR")} a ${new Date(endDate).toLocaleDateString("pt-BR")}` : undefined;

    const data = { totalOrders, totalRevenue, avgTicket, partsCost, grossProfit: totalRevenue - partsCost, completedCount, cancelledCount, monthly, profitByOrder };
    const element = React.createElement(ReportDocument, { data, period }) as unknown as React.ReactElement<import("@react-pdf/renderer").DocumentProps>;
    const buffer = await renderToBuffer(element);

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="Relatorio-Financeiro.pdf"`,
      },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return handleError(error);
  }
}
