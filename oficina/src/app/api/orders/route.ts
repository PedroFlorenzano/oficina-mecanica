import { NextRequest, NextResponse } from "next/server";
import { container } from "@/infrastructure/container";
import { CreateOrder } from "@/application/use-cases/orders/CreateOrder";
import { ReserveStock } from "@/application/use-cases/stock/ReserveStock";
import { handleError } from "@/lib/api-handler";

const DEMO_TENANT_ID = "demo-tenant"; // TODO: integrar com auth
const DEMO_USER_ID = "demo-user";     // TODO: integrar com auth

export async function GET() {
  const orders = await container.orderRepository.findAll(DEMO_TENANT_ID);
  return NextResponse.json(orders);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const useCase = new CreateOrder(container.orderRepository, container.vehicleRepository);
    const order = await useCase.execute(body, DEMO_TENANT_ID, DEMO_USER_ID);

    // Reservar estoque para peças vinculadas a stockItemId
    const allParts = [
      ...(body.complaints?.flatMap((c: any) => c.parts || []) || []),
      ...(body.parts || []),
    ];

    for (const part of allParts) {
      if (part.stockItemId) {
        try {
          const reserveStock = new ReserveStock(
            container.stockItemRepository,
            container.stockMovementRepository
          );
          await reserveStock.execute(part.stockItemId, part.quantity, order.id, DEMO_TENANT_ID);
        } catch {
          // TODO: integrar com alertas de WhatsApp
          // Não cancela a OS — apenas registra o erro de reserva
          console.warn(`Falha ao reservar estoque para item ${part.stockItemId} na OS ${order.id}`);
        }
      }
    }

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
