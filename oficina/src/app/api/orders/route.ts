import { NextRequest, NextResponse } from "next/server";
import { container } from "@/infrastructure/container";
import { CreateOrder } from "@/application/use-cases/orders/CreateOrder";
import { ReserveStock } from "@/application/use-cases/stock/ReserveStock";
import { ComplaintInput } from "@/domain/repositories/IServiceOrderRepository";
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
    if (error instanceof Response) return error;
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const userId = session.user.userId;

    const body = await request.json();
    const useCase = new CreateOrder(container.orderRepository, container.vehicleRepository);
    const order = await useCase.execute(body, tenantId, userId);

    if (!order) {
      return NextResponse.json({ error: "Erro ao criar ordem de serviço" }, { status: 500 });
    }

    // Reservar estoque para peças vinculadas a stockItemId
    const allParts = [
      ...(body.complaints?.flatMap((c: ComplaintInput) => c.parts || []) || []),
      ...(body.parts || []),
    ];

    const stockWarnings: string[] = [];
    for (const part of allParts) {
      if (part.stockItemId) {
        try {
          const reserveStock = new ReserveStock(
            container.stockItemRepository,
            container.stockMovementRepository
          );
          await reserveStock.execute(part.stockItemId, part.quantity, order.id, tenantId);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Erro desconhecido";
          stockWarnings.push(`${part.description || part.stockItemId}: ${msg}`);
        }
      }
    }

    return NextResponse.json(
      { ...order, stockWarnings: stockWarnings.length > 0 ? stockWarnings : undefined },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Response) return error;
    return handleError(error);
  }
}
