import { NextRequest, NextResponse } from "next/server";
import { createContainer } from "@/infrastructure/container";
import { CancelFiscalInvoice } from "@/application/use-cases/fiscal/CancelFiscalInvoice";
import { RetryInvoice } from "@/application/use-cases/fiscal/RetryInvoice";
import { handleError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";
import { FiscalProcessor } from "@/infrastructure/fiscal/FiscalProcessor";
import { createFiscalAdapter } from "@/infrastructure/fiscal/createFiscalAdapter";

export async function PATCH(
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

    if (body.action === "cancel") {
      const uc = new CancelFiscalInvoice(container.fiscalRepository);
      const result = await uc.execute(id, body.reason, tenantId);
      return NextResponse.json(result);
    }

    if (body.action === "retry") {
      const uc = new RetryInvoice(container.fiscalRepository);
      await uc.execute(id, tenantId);

      // Processar imediatamente (substitui BullMQ)
      const config = await container.fiscalRepository.getConfig(tenantId);
      const adapter = config ? createFiscalAdapter(config) : new (await import("@/infrastructure/fiscal/FakeFiscalAdapter")).FakeFiscalAdapter();
      const processor = new FiscalProcessor(container.fiscalRepository, adapter);
      await processor.process(id, tenantId);

      const result = await container.fiscalRepository.findInvoiceById(id, tenantId);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  } catch (error) {
    if (error instanceof Response) return error;
    return handleError(error);
  }
}
