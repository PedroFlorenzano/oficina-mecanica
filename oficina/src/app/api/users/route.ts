import { NextRequest, NextResponse } from "next/server";
import { container } from "@/infrastructure/container";
import { CreateUser } from "@/application/use-cases/users/CreateUser";
import { handleError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const { searchParams } = new URL(request.url);
    const roleFilter = searchParams.get("role");

    let users = await container.userRepository.findAll(tenantId);
    if (roleFilter) {
      users = users.filter((u: { role: string }) => u.role === roleFilter);
    }
    return NextResponse.json(users);
  } catch (error) {
    if (error instanceof Response) return error;
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const userId = session.user.userId;

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Acesso não autorizado para este perfil" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const useCase = new CreateUser(container.userRepository);
    const user = await useCase.execute(body, tenantId, userId);
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    return handleError(error);
  }
}
