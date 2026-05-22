import { NextRequest, NextResponse } from "next/server";
import { container } from "@/infrastructure/container";
import { IssueFiscalInvoice } from "@/application/use-cases/fiscal/IssueFiscalInvoice";
import { GetInvoicesByOrder } from "@/application/use-cases/fiscal/GetInvoicesByOrder";
import { handleError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const uc = new GetInvoicesByOrder(container.fiscalRepository);
    const result = await uc.execute(id, session.user.tenantId);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Response) return error;
    return handleError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
    const { id } = await params;
    const body = await request.json();
    const uc = new IssueFiscalInvoice(container.fiscalRepository, container.orderRepository);
    const result = await uc.execute(id, body.type, session.user.tenantId);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    return handleError(error);
  }
}
