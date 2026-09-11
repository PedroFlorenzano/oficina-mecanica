import { NextRequest, NextResponse } from "next/server";
import { createContainer } from "@/infrastructure/container";
import { CreateOrder } from "@/application/use-cases/orders/CreateOrder";
import { ReserveOrderParts } from "@/application/use-cases/stock/ReserveOrderParts";
import { handleError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const mechanicId = searchParams.get("mechanicId");
    const clientId = searchParams.get("clientId");

    const where: Record<string, unknown> = { tenantId };
    if (status) where.status = status;
    if (clientId) where.clientId = clientId;
    if (startDate || endDate) {
      where.createdAt = {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate + "T23:59:59.999Z") }),
      };
    }
    if (mechanicId) where.services = { some: { mechanicId } };

    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "15");

    const { prisma } = await import("@/infrastructure/database/prisma");
    const [data, total] = await Promise.all([
      prisma.serviceOrder.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          client: { select: { name: true } },
          vehicle: { select: { plate: true, model: true } },
        },
      }),
      prisma.serviceOrder.count({ where }),
    ]);

    return NextResponse.json({ data, total, page, pageSize });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const container = createContainer(tenantId);
    const userId = session.user.userId;

    const body = await request.json();
    const reserveOrderParts = new ReserveOrderParts(
      container.orderRepository,
      container.stockItemRepository,
      container.stockMovementRepository
    );
    const useCase = new CreateOrder(
      container.orderRepository,
      container.vehicleRepository,
      reserveOrderParts
    );
    const order = await useCase.execute(body, tenantId, userId);

    if (!order) {
      return NextResponse.json({ error: "Erro ao criar ordem de serviço" }, { status: 500 });
    }

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
