import { NextRequest, NextResponse } from "next/server";
import { createContainer } from "@/infrastructure/container";
import { CreateClient } from "@/application/use-cases/clients/CreateClient";
import { SearchClients } from "@/application/use-cases/clients/SearchClients";
import { handleError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const container = createContainer(tenantId);

    const search = request.nextUrl.searchParams.get("search") || "";
    // includeInactive=true para mostrar também clientes inativos (ex: filtro na listagem)
    const includeInactive = request.nextUrl.searchParams.get("includeInactive") === "true";

    if (search) {
      const useCase = new SearchClients(container.clientRepository);
      const clients = await useCase.execute(search, tenantId);
      return NextResponse.json(clients);
    }

    // Listagem geral: activeOnly depende de includeInactive
    const clients = await container.clientRepository.findAll(
      tenantId,
      includeInactive ? false : true
    );
    return NextResponse.json(clients);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const container = createContainer(tenantId);

    const body = await request.json();
    const useCase = new CreateClient(container.clientRepository);
    const client = await useCase.execute(body, tenantId);
    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
