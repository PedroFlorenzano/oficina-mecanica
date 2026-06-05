import { NextRequest, NextResponse } from "next/server";
import { createContainer } from "@/infrastructure/container";
import { SendApprovalLink } from "@/application/use-cases/whatsapp/SendApprovalLink";
import { SendDeliveryNotification } from "@/application/use-cases/whatsapp/SendDeliveryNotification";
import { SendMaintenanceReminder } from "@/application/use-cases/whatsapp/SendMaintenanceReminder";
import { handleError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const container = createContainer(tenantId);
    const body = await request.json();
    const baseUrl = new URL(request.url).origin;

    const { action, orderId, ...rest } = body;

    if (action === "approval") {
      const uc = new SendApprovalLink(container.whatsAppRepository, container.orderRepository);
      const result = await uc.execute(orderId, tenantId, baseUrl);
      return NextResponse.json(result, { status: 201 });
    }

    if (action === "delivery") {
      const uc = new SendDeliveryNotification(container.whatsAppRepository, container.orderRepository);
      const result = await uc.execute(orderId, tenantId, baseUrl);
      return NextResponse.json(result, { status: 201 });
    }

    if (action === "reminder") {
      const uc = new SendMaintenanceReminder(container.whatsAppRepository);
      const result = await uc.execute(rest, tenantId);
      return NextResponse.json(result, { status: 201 });
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  } catch (error) {
    if (error instanceof Response) return error;
    return handleError(error);
  }
}
