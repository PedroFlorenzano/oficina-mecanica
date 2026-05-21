import { NextRequest, NextResponse } from "next/server";
import { container } from "@/infrastructure/container";
import { UpdateOrderStatus } from "@/application/use-cases/orders/UpdateOrderStatus";
import { CancelOrder } from "@/application/use-cases/orders/CancelOrder";
import { ReverseStockReservations } from "@/application/use-cases/stock/ReverseStockReservations";
import { ConfirmStockConsumption } from "@/application/use-cases/stock/ConfirmStockConsumption";
import { handleError } from "@/lib/api-handler";

const DEMO_USER_ID = "demo-user";     // TODO: integrar com auth
const DEMO_TENANT_ID = "demo-tenant"; // TODO: integrar com auth

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const order = await container.orderRepository.findById(id);

  if (!order) {
    return NextResponse.json({ error: "OS não encontrada" }, { status: 404 });
  }

  return NextResponse.json(order);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (body.action === "cancel") {
      // Fluxo de cancelamento com reversão de reservas de estoque
      const reverseReservations = new ReverseStockReservations(
        container.stockItemRepository,
        container.stockMovementRepository
      );
      const useCase = new CancelOrder(container.orderRepository, reverseReservations);
      const order = await useCase.execute(id, body.reason, DEMO_TENANT_ID);
      return NextResponse.json(order);
    }

    // Fluxo de atualização de status — aciona ConfirmStockConsumption ao concluir
    const reverseReservations = new ReverseStockReservations(
      container.stockItemRepository,
      container.stockMovementRepository
    );
    const confirmStockConsumption = new ConfirmStockConsumption(
      container.stockItemRepository,
      container.stockMovementRepository,
      reverseReservations
    );
    const useCase = new UpdateOrderStatus(container.orderRepository, confirmStockConsumption);
    const updated = await useCase.execute(id, body.status, DEMO_USER_ID);
    return NextResponse.json(updated);
  } catch (error) {
    return handleError(error);
  }
}
