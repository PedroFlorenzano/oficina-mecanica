import { NextRequest, NextResponse } from "next/server";
import { createContainer } from "@/infrastructure/container";
import { handleError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";
import { createFiscalAdapter } from "@/infrastructure/fiscal/createFiscalAdapter";
import { SefazNFeAdapter } from "@/infrastructure/fiscal/SefazNFeAdapter";

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });

    const tenantId = session.user.tenantId;
    const container = createContainer(tenantId);
    const config = await container.fiscalRepository.getConfig(tenantId);

    if (!config?.certificateBase64) {
      return NextResponse.json({ error: "Certificado digital não configurado" }, { status: 400 });
    }

    const body = await request.json();
    const { invoiceId, correcao, nSeqEvento } = body;

    if (!invoiceId || !correcao) {
      return NextResponse.json({ error: "Campos obrigatórios: invoiceId, correcao" }, { status: 400 });
    }
    if (String(correcao).length < 15) {
      return NextResponse.json({ error: "Correção deve ter no mínimo 15 caracteres" }, { status: 400 });
    }

    const invoice = await container.fiscalRepository.findInvoiceById(invoiceId, tenantId);
    if (!invoice) return NextResponse.json({ error: "Nota não encontrada" }, { status: 404 });
    if (invoice.type !== "NFE") return NextResponse.json({ error: "CC-e só é permitida para NF-e" }, { status: 400 });
    if (invoice.status !== "AUTHORIZED") return NextResponse.json({ error: "Nota precisa estar autorizada" }, { status: 400 });
    if (!invoice.accessKey) return NextResponse.json({ error: "Nota sem chave de acesso" }, { status: 400 });

    const adapter = createFiscalAdapter(config, "NFE");
    if (!(adapter instanceof SefazNFeAdapter)) {
      return NextResponse.json({ error: "Adapter real não disponível" }, { status: 400 });
    }

    const result = await adapter.cartaCorrecao(invoice.accessKey, correcao, nSeqEvento || 1);
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}
