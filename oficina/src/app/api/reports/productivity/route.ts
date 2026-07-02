import { NextResponse } from "next/server";
import { handleError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";
import { withTenant } from "@/infrastructure/database/prisma";
import { GenerateProductivityReport } from "@/application/use-cases/reports/GenerateProductivityReport";

export async function GET() {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const prisma = withTenant(tenantId);

    const useCase = new GenerateProductivityReport(prisma);
    const report = await useCase.execute(tenantId, session.user.role);

    return NextResponse.json(report);
  } catch (error) {
    return handleError(error);
  }
}
