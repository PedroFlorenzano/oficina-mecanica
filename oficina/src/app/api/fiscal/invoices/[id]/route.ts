import { NextRequest, NextResponse } from "next/server";
import { container } from "@/infrastructure/container";
import { CancelFiscalInvoice } from "@/application/use-cases/fiscal/CancelFiscalInvoice";
import { RetryInvoice } from "@/application/use-cases/fiscal/RetryInvoice";
import { handleError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";
import { FiscalProcessor } from "@/infrastructure/fiscal/FiscalProcessor";
import { FakeFiscalAdapter } from "@/infrastructure/fiscal/FakeFiscalAdapter";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
    const { id } = await params;
    const body = await request.json();
    const tenantId = session.user.tenantId;

    if (body.action === "cancel") {
      const uc = new CancelFiscalInvoice(container.fiscalRepository);
      const result = await uc.execute(id, body.reason, tenantId);
      return NextResponse.json(result);
    }

    if (body.action === "retry") {
      const uc = new RetryInvoice(container.fiscalRepository);
      await uc.execute(id, tenantId);

      // Processar imediatamente (substitui BullMQ)
      const processor = new FiscalProcessor(container.fiscalRepository, new FakeFiscalAdapter());
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
