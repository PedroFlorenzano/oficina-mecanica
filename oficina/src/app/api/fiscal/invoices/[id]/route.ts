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
      const invoice = await container.fiscalRepository.findInvoiceById(id, tenantId);
      if (!invoice) return NextResponse.json({ error: "Nota não encontrada" }, { status: 404 });
      if (invoice.status !== "AUTHORIZED") return NextResponse.json({ error: "Apenas notas autorizadas podem ser canceladas" }, { status: 400 });
      if (!body.reason || String(body.reason).trim().length < 15) return NextResponse.json({ error: "Motivo deve ter no mínimo 15 caracteres" }, { status: 400 });

      // Chamar adapter real para cancelar na SEFAZ/Prefeitura
      const config = await container.fiscalRepository.getConfig(tenantId);
      if (config?.certificateBase64 && invoice.accessKey) {
        const invoiceType = (invoice.type || "NFSE") as "NFE" | "NFSE";
        const adapter = createFiscalAdapter(config, invoiceType);
        await adapter.cancel(invoice.accessKey, body.reason.trim(), invoice.protocolNumber || undefined);
      }

      const result = await container.fiscalRepository.cancelInvoice(id, body.reason.trim());
      return NextResponse.json(result);
    }

    if (body.action === "retry") {
      const uc = new RetryInvoice(container.fiscalRepository);
      await uc.execute(id, tenantId);

      // Processar imediatamente (substitui BullMQ)
      const config = await container.fiscalRepository.getConfig(tenantId);
      const invoiceData = await container.fiscalRepository.findInvoiceById(id, tenantId);
      const invoiceType = (invoiceData?.type || "NFSE") as "NFE" | "NFSE";
      const adapter = config ? createFiscalAdapter(config, invoiceType) : new (await import("@/infrastructure/fiscal/FakeFiscalAdapter")).FakeFiscalAdapter();
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
