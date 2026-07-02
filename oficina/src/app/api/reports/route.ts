import { NextRequest, NextResponse } from "next/server";
import { handleError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";
import { withTenant } from "@/infrastructure/database/prisma";
import { GenerateFinancialReport } from "@/application/use-cases/reports/GenerateFinancialReport";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const prisma = withTenant(tenantId);

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    const useCase = new GenerateFinancialReport(prisma);
    const report = await useCase.execute(tenantId, session.user.role, { startDate, endDate });

    return NextResponse.json(report);
  } catch (error) {
    return handleError(error);
  }
}
