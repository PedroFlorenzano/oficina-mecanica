import { NextRequest, NextResponse } from "next/server";
import { createContainer } from "@/infrastructure/container";
import { GetClientHistory } from "@/application/use-cases/clients/GetClientHistory";
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
    const useCase = new GetClientHistory(
      container.clientRepository,
      container.orderRepository
    );
    const history = await useCase.execute(id, tenantId);
    return NextResponse.json(history);
  } catch (error) {
    if (error instanceof Response) return error;
    return handleError(error);
  }
}
