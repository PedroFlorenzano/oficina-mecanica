import { NextRequest, NextResponse } from "next/server";
import { container } from "@/infrastructure/container";
import { GetMechanicCommissionSummary } from "@/application/use-cases/commissions/GetMechanicCommissionSummary";
import { handleError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const mechanicId = searchParams.get("mechanicId") || session.user.userId;

    const useCase = new GetMechanicCommissionSummary(container.commissionRepository);
    const result = await useCase.execute(mechanicId, session.user.tenantId, session.user.userId, session.user.role);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Response) return error;
    return handleError(error);
  }
}
