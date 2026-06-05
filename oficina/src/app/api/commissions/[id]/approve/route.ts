import { NextRequest, NextResponse } from "next/server";
import { createContainer } from "@/infrastructure/container";
import { ApproveCommission } from "@/application/use-cases/commissions/ApproveCommission";
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

    const useCase = new ApproveCommission(container.commissionRepository);
    const result = await useCase.execute(id, tenantId, session.user.userId, session.user.role);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Response) return error;
    return handleError(error);
  }
}
