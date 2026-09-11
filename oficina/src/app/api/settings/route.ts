import { NextRequest, NextResponse } from "next/server";
import { createContainer } from "@/infrastructure/container";
import { handleError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";
import { GetTenantSettings } from "@/application/use-cases/tenants/GetTenantSettings";
import { UpdateTenantSettings } from "@/application/use-cases/tenants/UpdateTenantSettings";

/** GET — qualquer usuário autenticado da oficina lê as configurações. */
export async function GET() {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const container = createContainer(tenantId);

    const useCase = new GetTenantSettings(container.tenantSettingsRepository);
    const result = await useCase.execute(tenantId);

    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}

/** PUT — restrito a ADMIN. tenantId sempre da sessão. */
export async function PUT(request: NextRequest) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const container = createContainer(tenantId);

    const useCase = new UpdateTenantSettings(container.tenantSettingsRepository);
    const result = await useCase.execute(
      await request.json(),
      tenantId,
      session.user.role
    );

    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}
