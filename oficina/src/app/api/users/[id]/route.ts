import { NextRequest, NextResponse } from "next/server";
import { createContainer } from "@/infrastructure/container";
import { UpdateUser } from "@/application/use-cases/users/UpdateUser";
import { ActivateUser } from "@/application/use-cases/users/ActivateUser";
import { DeactivateUser } from "@/application/use-cases/users/DeactivateUser";
import { handleError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const container = createContainer(tenantId);

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Acesso não autorizado para este perfil" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const useCase = new UpdateUser(container.userRepository);
    const user = await useCase.execute(id, body, tenantId);
    return NextResponse.json(user);
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
    const container = createContainer(tenantId);
    const userId = session.user.userId;

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Acesso não autorizado para este perfil" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    if (body.action === "deactivate") {
      const useCase = new DeactivateUser(container.userRepository);
      const user = await useCase.execute(id, tenantId, userId);
      return NextResponse.json(user);
    }

    if (body.action === "activate") {
      const useCase = new ActivateUser(container.userRepository);
      const user = await useCase.execute(id, tenantId);
      return NextResponse.json(user);
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  } catch (error) {
    if (error instanceof Response) return error;
    return handleError(error);
  }
}
