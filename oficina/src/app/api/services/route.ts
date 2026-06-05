import { NextRequest, NextResponse } from "next/server";
import { createContainer } from "@/infrastructure/container";
import { CreateService } from "@/application/use-cases/services/CreateService";
import { handleError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const container = createContainer(tenantId);

    const services = await container.serviceCatalogRepository.findAll(tenantId);
    return NextResponse.json(services);
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

    const body = await request.json();
    const useCase = new CreateService(container.serviceCatalogRepository);
    const service = await useCase.execute(body, tenantId);
    return NextResponse.json(service, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    return handleError(error);
  }
}
