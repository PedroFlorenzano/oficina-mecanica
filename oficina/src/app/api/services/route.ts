import { NextRequest, NextResponse } from "next/server";
import { container } from "@/infrastructure/container";
import { CreateService } from "@/application/use-cases/services/CreateService";
import { handleError } from "@/lib/api-handler";

const DEMO_TENANT_ID = "demo-tenant";

export async function GET() {
  const services = await container.serviceCatalogRepository.findAll(DEMO_TENANT_ID);
  return NextResponse.json(services);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const useCase = new CreateService(container.serviceCatalogRepository);
    const service = await useCase.execute(body, DEMO_TENANT_ID);
    return NextResponse.json(service, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
