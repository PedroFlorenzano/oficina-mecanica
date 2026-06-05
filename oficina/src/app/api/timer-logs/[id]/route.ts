import { NextRequest, NextResponse } from "next/server";
import { createContainer } from "@/infrastructure/container";
import { CorrectTimer } from "@/application/use-cases/timer/CorrectTimer";
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

    const adminUserId = session.user.userId;
    const userRole = session.user.role;

    const body = await request.json();
    const { newTotalSeconds } = body;

    const useCase = new CorrectTimer(container.timerLogRepository);
    const updated = await useCase.execute({
      timerLogId: id,
      newTotalSeconds,
      adminUserId,
      tenantId,
      userRole,
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    if (error instanceof Response) return error;
    return handleError(error);
  }
}
