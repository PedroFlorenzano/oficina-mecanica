import { NextRequest, NextResponse } from "next/server";
import { createContainer } from "@/infrastructure/container";
import { GetPista } from "@/application/use-cases/orders/GetPista";
import { UpdatePistaStatus } from "@/application/use-cases/orders/UpdatePistaStatus";
import { SendStatusNotification } from "@/application/use-cases/whatsapp/SendStatusNotification";
import { handleError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const container = createContainer(tenantId);

    const useCase = new GetPista(container.orderRepository);
    // GetPista devolve cada OS enriquecida com `statusSince` (derivado do
    // StatusHistory) para o indicador de OS parada na Pista (item 44).
    // A Date serializa como ISO no JSON — o cartão a interpreta no cliente.
    const orders = await useCase.execute(tenantId);
    return NextResponse.json(orders);
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const container = createContainer(tenantId);
    const userId = session.user.userId;

    const body = await request.json();
    const useCase = new UpdatePistaStatus(container.orderRepository);
    const updated = await useCase.execute(body.id, body.status, userId);

    // Fire-and-forget: notifica cliente via WhatsApp sem bloquear resposta.
    // Com o whatsAppRepository, o template configurado pela oficina é usado (item 14).
    const notifier = new SendStatusNotification(
      container.orderRepository,
      container.whatsAppRepository
    );
    notifier.execute(body.id, body.status).catch(() => {});

    return NextResponse.json(updated);
  } catch (error) {
    return handleError(error);
  }
}
