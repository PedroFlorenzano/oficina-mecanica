import { NextRequest, NextResponse } from "next/server";
import { handleError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";
import { withTenant } from "@/infrastructure/database/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
    }

    const tenantId = session.user.tenantId;
    const prisma = withTenant(tenantId);
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const dateFilter: Record<string, Date> = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate + "T23:59:59.999Z");

    // Buscar movimentações de CONSUMPTION (peças usadas em OS concluídas)
    const movements = await prisma.stockMovement.findMany({
      where: {
        type: "CONSUMPTION",
        stockItem: { tenantId },
        ...(startDate || endDate ? { createdAt: dateFilter } : {}),
      },
      select: {
        quantity: true,
        unitCost: true,
        stockItem: { select: { id: true, description: true, brand: true, code: true, avgCost: true } },
      },
    });

    // Agrupar por item
    const map = new Map<string, { description: string; brand: string | null; code: string | null; totalQty: number; totalCost: number }>();
    for (const m of movements) {
      const key = m.stockItem.id;
      const existing = map.get(key);
      const cost = Math.abs(m.quantity) * (m.unitCost ?? m.stockItem.avgCost ?? 0);
      if (existing) {
        existing.totalQty += Math.abs(m.quantity);
        existing.totalCost += cost;
      } else {
        map.set(key, {
          description: m.stockItem.description,
          brand: m.stockItem.brand,
          code: m.stockItem.code,
          totalQty: Math.abs(m.quantity),
          totalCost: cost,
        });
      }
    }

    // Top 10 por quantidade
    const top = [...map.values()]
      .sort((a, b) => b.totalQty - a.totalQty)
      .slice(0, 10);

    return NextResponse.json(top);
  } catch (error) {
    return handleError(error);
  }
}
