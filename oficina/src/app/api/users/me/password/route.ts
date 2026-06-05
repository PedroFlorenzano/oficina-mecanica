import { NextRequest, NextResponse } from "next/server";
import { createContainer } from "@/infrastructure/container";
import { ChangePassword } from "@/application/use-cases/users/ChangePassword";
import { handleError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const container = createContainer(tenantId);
    const userId = session.user.userId;

    const body = await request.json();
    const useCase = new ChangePassword(container.userRepository);
    await useCase.execute(userId, body.currentPassword, body.newPassword, tenantId);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    return handleError(error);
  }
}
