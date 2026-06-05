import { NextRequest, NextResponse } from "next/server";
import { createContainer } from "@/infrastructure/container";
import { GetTimersByService } from "@/application/use-cases/timer/GetTimersByService";
import { handleError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const container = createContainer(tenantId);
    const { id: orderServiceId } = await params;

    const useCase = new GetTimersByService(container.timerLogRepository);
    const result = await useCase.execute({ orderServiceId, tenantId });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof Response) return error;
    return handleError(error);
  }
}
