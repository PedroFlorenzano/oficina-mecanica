import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createContainer } from "@/infrastructure/container";
import { handleError } from "@/lib/api-handler";

// GET /api/appointments/config
export async function GET() {
  try {
    const session = await requireAuth();
    const container = createContainer(session.user.tenantId);
    const config = await container.appointmentRepository.getConfig(session.user.tenantId);
    return NextResponse.json(config || { enabled: false });
  } catch (error) {
    return handleError(error);
  }
}

// PUT /api/appointments/config
export async function PUT(request: NextRequest) {
  try {
    const session = await requireAuth();
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const container = createContainer(session.user.tenantId);
    const body = await request.json();
    const config = await container.appointmentRepository.upsertConfig(session.user.tenantId, body);
    return NextResponse.json(config);
  } catch (error) {
    return handleError(error);
  }
}
