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
    const { ano, serie, numInicio, numFim, justificativa } = body;

    if (!ano || !numInicio || !numFim || !justificativa) {
      return NextResponse.json({ error: "Campos obrigatórios: ano, serie, numInicio, numFim, justificativa" }, { status: 400 });
    }
    if (String(justificativa).length < 15) {
      return NextResponse.json({ error: "Justificativa deve ter no mínimo 15 caracteres" }, { status: 400 });
    }
    if (numFim < numInicio) {
      return NextResponse.json({ error: "Número final deve ser maior ou igual ao inicial" }, { status: 400 });
    }

    const adapter = createFiscalAdapter(config, "NFE");
    if (!(adapter instanceof SefazNFeAdapter)) {
      return NextResponse.json({ error: "Adapter real não disponível (certificado ou ambiente incorreto)" }, { status: 400 });
    }

    const result = await adapter.inutilizar(ano, serie ?? config.nfeSeries, numInicio, numFim, justificativa);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Response) return error;
    return handleError(error);
  }
}
