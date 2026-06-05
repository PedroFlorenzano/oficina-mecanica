import { NextRequest, NextResponse } from "next/server";
import { createContainer } from "@/infrastructure/container";
import { handleError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const container = createContainer(tenantId);
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
    const config = await container.fiscalRepository.getConfig(tenantId);
    return NextResponse.json(config || { enabled: false });
  } catch (error) {
    if (error instanceof Response) return error;
    return handleError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const container = createContainer(tenantId);
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
    const body = await request.json();
    const config = await container.fiscalRepository.upsertConfig(tenantId, body);
    return NextResponse.json(config);
  } catch (error) {
    if (error instanceof Response) return error;
    return handleError(error);
  }
}
