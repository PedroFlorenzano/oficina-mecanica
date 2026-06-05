import { NextRequest, NextResponse } from "next/server";
import { createContainer } from "@/infrastructure/container";
import { StartTimer } from "@/application/use-cases/timer/StartTimer";
import { handleError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const container = createContainer(tenantId);
    const userId = session.user.userId;
    const userRole = session.user.role;

    const body = await request.json();
    // body should contain: { orderServiceId: string }

    const useCase = new StartTimer(container.timerLogRepository);
    const result = await useCase.execute({
      orderServiceId: body.orderServiceId,
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
