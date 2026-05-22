import { NextRequest, NextResponse } from "next/server";
import { container } from "@/infrastructure/container";
import { handleError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const invoices = await container.fiscalRepository.findAllInvoices(session.user.tenantId, {
      status: searchParams.get("status") || undefined,
      type: searchParams.get("type") || undefined,
    });
    return NextResponse.json(invoices);
  } catch (error) {
    if (error instanceof Response) return error;
    return handleError(error);
  }
}
