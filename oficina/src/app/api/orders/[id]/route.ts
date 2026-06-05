import { NextRequest, NextResponse } from "next/server";
import { createContainer } from "@/infrastructure/container";
import { UpdateOrderStatus } from "@/application/use-cases/orders/UpdateOrderStatus";
import { UpdateOrder } from "@/application/use-cases/orders/UpdateOrder";
import { CancelOrder } from "@/application/use-cases/orders/CancelOrder";
import { ReverseStockReservations } from "@/application/use-cases/stock/ReverseStockReservations";
import { ConfirmStockConsumption } from "@/application/use-cases/stock/ConfirmStockConsumption";
import { handleError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const container = createContainer(tenantId);
    const { id } = await params;

    const order = await container.orderRepository.findById(id);

    if (!order) {
      return NextResponse.json({ error: "OS não encontrada" }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error) {
    if (error instanceof Response) return error;
    return handleError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const container = createContainer(tenantId);
    const userId = session.user.userId;
    const { id } = await params;
    const body = await request.json();

    if (body.action === "cancel") {
      // Fluxo de cancelamento com reversão de reservas de estoque
      const reverseReservations = new ReverseStockReservations(
        container.stockItemRepository,
        container.stockMovementRepository
      );
      const useCase = new CancelOrder(container.orderRepository, reverseReservations);
      const order = await useCase.execute(id, body.reason, tenantId, userId);
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
    const updated = await useCase.execute(id, body.status, userId);
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Response) return error;
    return handleError(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const container = createContainer(tenantId);
    const { id } = await params;
    const body = await request.json();

    const useCase = new UpdateOrder(
      container.orderRepository,
      container.stockItemRepository,
      container.stockMovementRepository
    );
    const result = await useCase.execute(id, body, tenantId);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Response) return error;
    return handleError(error);
  }
}
