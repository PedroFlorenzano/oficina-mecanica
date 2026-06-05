import { NextRequest, NextResponse } from "next/server";
import { createContainer } from "@/infrastructure/container";
import { PauseTimer } from "@/application/use-cases/timer/PauseTimer";
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

    const useCase = new PauseTimer(container.timerLogRepository);
    const result = await useCase.execute({
      timerLogId: id,
      pauseReason: body.pauseReason,
      userId: session.user.userId,
      tenantId,
      userRole: session.user.role,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof Response) return error;
    return handleError(error);
  }
}
