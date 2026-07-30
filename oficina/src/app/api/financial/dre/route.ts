import { NextRequest, NextResponse } from "next/server";
import { createContainer } from "@/infrastructure/container";
import { GenerateDRE } from "@/application/use-cases/financial/GenerateDRE";
import { handleError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";
import { withTenant } from "@/infrastructure/database/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Acesso restrito a administradores" },
        { status: 403 }
      );
    }

    const tenantId = session.user.tenantId;
    const container = createContainer(tenantId);
    const db = withTenant(tenantId);
    const { searchParams } = new URL(request.url);

    // Default: últimos 6 meses
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const startDate = searchParams.get("startDate") || sixMonthsAgo.toISOString().split("T")[0];
    const endDate = searchParams.get("endDate") || now.toISOString().split("T")[0];

    const useCase = new GenerateDRE(container.financialEntryRepository, db);
    const dre = await useCase.execute({ startDate, endDate }, tenantId);

    return NextResponse.json(dre);
  } catch (error) {
    return handleError(error);
  }
}
