import { NextRequest, NextResponse } from "next/server";
import { container } from "@/infrastructure/container";
import { UpdateClient } from "@/application/use-cases/clients/UpdateClient";
import { DeleteClient } from "@/application/use-cases/clients/DeleteClient";
import { ActivateClient } from "@/application/use-cases/clients/ActivateClient";
import { handleError } from "@/lib/api-handler";

const DEMO_TENANT_ID = "demo-tenant"; // TODO: integrar com auth

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const client = await container.clientRepository.findById(id, DEMO_TENANT_ID);

  if (!client) {
    return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
  }

  return NextResponse.json(client);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const useCase = new UpdateClient(container.clientRepository);
    const client = await useCase.execute(id, body, DEMO_TENANT_ID);
    return NextResponse.json(client);
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (body.action === "activate") {
      const useCase = new ActivateClient(container.clientRepository);
      const result = await useCase.execute(id, DEMO_TENANT_ID);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // TODO: integrar com auth — obter tenantId do JWT
    const useCase = new DeleteClient(container.clientRepository);
    const result = await useCase.execute(id, DEMO_TENANT_ID);
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}
