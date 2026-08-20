import { NextRequest, NextResponse } from "next/server";
import { createContainer } from "@/infrastructure/container";
import { ToggleItemApproval } from "@/application/use-cases/orders/ToggleItemApproval";
import { handleError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const container = createContainer(tenantId);
    const { id } = await params;
    const body = await request.json();

    const useCase = new ToggleItemApproval(container.orderRepository);
    const result = await useCase.execute(
      {
        orderId: id,
        itemType: body.itemType,
        itemId: body.itemId,
        approved: Boolean(body.approved),
      },
      tenantId
    );
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Response) return error;
    return handleError(error);
  }
}
