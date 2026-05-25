import { NextRequest, NextResponse } from "next/server";
import { container } from "@/infrastructure/container";
import { CreateOrder } from "@/application/use-cases/orders/CreateOrder";
import { ReserveStock } from "@/application/use-cases/stock/ReserveStock";
import { handleError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;

    const orders = await container.orderRepository.findAll(tenantId);
    return NextResponse.json(orders);
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

    // Reservar estoque para peças vinculadas a stockItemId
    const allParts = [
      ...(body.complaints?.flatMap((c: any) => c.parts || []) || []),
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
