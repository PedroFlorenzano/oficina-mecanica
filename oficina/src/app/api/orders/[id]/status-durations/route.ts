import { NextRequest, NextResponse } from "next/server";
import { createContainer } from "@/infrastructure/container";
import { CalculateStatusDurations } from "@/application/use-cases/orders/CalculateStatusDurations";
import { handleError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";

// Item 24 — tempo por status da OS. Restrito a ADMIN no servidor:
// o use case lança ForbiddenError (403) para qualquer outro papel.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const container = createContainer(tenantId);
    const { id } = await params;

    const useCase = new CalculateStatusDurations(container.orderRepository);
    const durations = await useCase.execute(id, tenantId, session.user.role);

    return NextResponse.json(durations);
  } catch (error) {
    if (error instanceof Response) return error;
    return handleError(error);
  }
}
