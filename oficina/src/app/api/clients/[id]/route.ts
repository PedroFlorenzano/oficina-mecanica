import { NextRequest, NextResponse } from "next/server";
import { container } from "@/infrastructure/container";
import { UpdateClient } from "@/application/use-cases/clients/UpdateClient";
import { DeleteClient } from "@/application/use-cases/clients/DeleteClient";
import { ActivateClient } from "@/application/use-cases/clients/ActivateClient";
import { handleError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const { id } = await params;

    const client = await container.clientRepository.findById(id, tenantId);

    if (!client) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
    }

    return NextResponse.json(client);
  } catch (error) {
    if (error instanceof Response) return error;
    return handleError(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const { id } = await params;
    const body = await request.json();
    const useCase = new UpdateClient(container.clientRepository);
    const client = await useCase.execute(id, body, tenantId);
    return NextResponse.json(client);
  } catch (error) {
    if (error instanceof Response) return error;
    return handleError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const { id } = await params;
    const body = await request.json();

    if (body.action === "activate") {
      const useCase = new ActivateClient(container.clientRepository);
      const result = await useCase.execute(id, tenantId);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  } catch (error) {
    if (error instanceof Response) return error;
    return handleError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const { id } = await params;
    const useCase = new DeleteClient(container.clientRepository);
    const result = await useCase.execute(id, tenantId);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Response) return error;
    return handleError(error);
  }
}
