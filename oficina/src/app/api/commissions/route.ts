import { NextRequest, NextResponse } from "next/server";
import { createContainer } from "@/infrastructure/container";
import { GenerateCommission } from "@/application/use-cases/commissions/GenerateCommission";
import { ListCommissions } from "@/application/use-cases/commissions/ListCommissions";
import { handleError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const container = createContainer(tenantId);
    const { searchParams } = new URL(request.url);

    const useCase = new ListCommissions(container.commissionRepository);
    const result = await useCase.execute(
      tenantId,
      session.user.userId,
      session.user.role,
      {
        mechanicId: searchParams.get("mechanicId") || undefined,
        status: searchParams.get("status") || undefined,
        startDate: searchParams.get("startDate") || undefined,
        endDate: searchParams.get("endDate") || undefined,
      }
    );

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Response) return error;
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const container = createContainer(tenantId);
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const body = await request.json();
    const useCase = new GenerateCommission(container.commissionRepository, container.userRepository);
    const result = await useCase.execute(body, tenantId);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    return handleError(error);
  }
}
