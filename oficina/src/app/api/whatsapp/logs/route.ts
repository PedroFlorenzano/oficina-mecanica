import { NextRequest, NextResponse } from "next/server";
import { createContainer } from "@/infrastructure/container";
import { GetMessageLogs } from "@/application/use-cases/whatsapp/GetMessageLogs";
import { handleError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const container = createContainer(tenantId);
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId") || undefined;

    const uc = new GetMessageLogs(container.whatsAppRepository);
    const result = await uc.execute(session.user.tenantId, orderId);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Response) return error;
    return handleError(error);
  }
}
