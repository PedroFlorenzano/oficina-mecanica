import { NextRequest, NextResponse } from "next/server";
import { createContainer } from "@/infrastructure/container";
import { BulkDeleteServices } from "@/application/use-cases/services/BulkDeleteServices";
import { handleError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const container = createContainer(tenantId);

    const body = await request.json();
    const useCase = new BulkDeleteServices(container.serviceCatalogRepository);
    const result = await useCase.execute(body?.ids ?? [], tenantId);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Response) return error;
    return handleError(error);
  }
}
