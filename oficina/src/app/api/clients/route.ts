import { NextRequest, NextResponse } from "next/server";
import { container } from "@/infrastructure/container";
import { CreateClient } from "@/application/use-cases/clients/CreateClient";
import { SearchClients } from "@/application/use-cases/clients/SearchClients";
import { handleError } from "@/lib/api-handler";

const DEMO_TENANT_ID = "demo-tenant";

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.get("search") || "";
  // includeInactive=true para mostrar também clientes inativos (ex: filtro na listagem)
  const includeInactive = request.nextUrl.searchParams.get("includeInactive") === "true";

  if (search) {
    const useCase = new SearchClients(container.clientRepository);
    const clients = await useCase.execute(search, DEMO_TENANT_ID);
    return NextResponse.json(clients);
  }

  // Listagem geral: activeOnly depende de includeInactive
  const clients = await container.clientRepository.findAll(
    DEMO_TENANT_ID,
    includeInactive ? false : true
  );
  return NextResponse.json(clients);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const useCase = new CreateClient(container.clientRepository);
    const client = await useCase.execute(body, DEMO_TENANT_ID);
    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
