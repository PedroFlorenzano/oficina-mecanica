import { NextRequest, NextResponse } from "next/server";
import { container } from "@/infrastructure/container";
import { ResumeTimer } from "@/application/use-cases/timer/ResumeTimer";
import { handleError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const userId = session.user.userId;
    const tenantId = session.user.tenantId;
    const userRole = session.user.role;

    const { id: timerLogId } = await params;

    const useCase = new ResumeTimer(container.timerLogRepository);
    const result = await useCase.execute({
      timerLogId,
      userId,
      tenantId,
      userRole,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    return handleError(error);
  }
}
