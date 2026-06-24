import { NextRequest, NextResponse } from "next/server";
import { createContainer } from "@/infrastructure/container";
import { IssueFiscalInvoice } from "@/application/use-cases/fiscal/IssueFiscalInvoice";
import { GetInvoicesByOrder } from "@/application/use-cases/fiscal/GetInvoicesByOrder";
import { handleError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";
import { FiscalProcessor } from "@/infrastructure/fiscal/FiscalProcessor";
import { createFiscalAdapter } from "@/infrastructure/fiscal/createFiscalAdapter";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const container = createContainer(tenantId);
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
    const tenantId = session.user.tenantId;
    const container = createContainer(tenantId);
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
    const { id } = await params;
    const body = await request.json();

    const uc = new IssueFiscalInvoice(container.fiscalRepository, container.orderRepository);
    const invoice = await uc.execute(id, body.type, tenantId);

    // Processar imediatamente (substitui BullMQ)
    const config = await container.fiscalRepository.getConfig(tenantId);
    const adapter = config ? createFiscalAdapter(config) : new (await import("@/infrastructure/fiscal/FakeFiscalAdapter")).FakeFiscalAdapter();
    const processor = new FiscalProcessor(container.fiscalRepository, adapter);
    await processor.process(invoice.id, tenantId);

    // Retornar invoice atualizada
    const result = await container.fiscalRepository.findInvoiceById(invoice.id, tenantId);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    return handleError(error);
  }
}
