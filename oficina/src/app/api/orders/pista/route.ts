import { NextRequest, NextResponse } from "next/server";
import { container } from "@/infrastructure/container";
import { GetPista } from "@/application/use-cases/orders/GetPista";
import { UpdatePistaStatus } from "@/application/use-cases/orders/UpdatePistaStatus";
import { SendStatusNotification } from "@/application/use-cases/whatsapp/SendStatusNotification";
import { handleError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;

    const useCase = new GetPista(container.orderRepository);
    const orders = await useCase.execute(tenantId);
    return NextResponse.json(orders);
  } catch (error) {
    if (error instanceof Response) return error;
    return handleError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAuth();
    const userId = session.user.userId;

    const body = await request.json();
    const useCase = new UpdatePistaStatus(container.orderRepository);
    const updated = await useCase.execute(body.id, body.status, userId);

    // Fire-and-forget: notifica cliente via WhatsApp sem bloquear resposta
    const notifier = new SendStatusNotification(container.orderRepository);
    notifier.execute(body.id, body.status).catch(() => {});

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Response) return error;
    return handleError(error);
  }
}
