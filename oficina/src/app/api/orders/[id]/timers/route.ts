import { NextRequest, NextResponse } from "next/server";
import { createContainer } from "@/infrastructure/container";
import { GetTimersByOrder } from "@/application/use-cases/timer/GetTimersByOrder";
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
    const { id: orderId } = await params;

    const useCase = new GetTimersByOrder(container.timerLogRepository);
    const timers = await useCase.execute({ orderId, tenantId });

    return NextResponse.json(timers, { status: 200 });
  } catch (error) {
    if (error instanceof Response) return error;
    return handleError(error);
  }
}
