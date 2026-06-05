import { NextRequest, NextResponse } from "next/server";
import { createContainer } from "@/infrastructure/container";
import { FinishTimer } from "@/application/use-cases/timer/FinishTimer";
import { handleError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const container = createContainer(tenantId);
    const userId = session.user.userId;
    const userRole = session.user.role;

    const { id: timerLogId } = await params;

    const useCase = new FinishTimer(container.timerLogRepository);
    const result = await useCase.execute({
      timerLogId,
      userId,
      tenantId,
      userRole,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof Response) return error;
    return handleError(error);
  }
}
