import { NextResponse } from "next/server";
import { createContainer } from "@/infrastructure/container";
import { requireAuth } from "@/lib/auth";
import { createFiscalAdapter } from "@/infrastructure/fiscal/createFiscalAdapter";
import { SefazNFeAdapter } from "@/infrastructure/fiscal/SefazNFeAdapter";

export async function GET() {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const container = createContainer(tenantId);
    const config = await container.fiscalRepository.getConfig(tenantId);

    if (!config?.certificateBase64) {
      return NextResponse.json({ online: null, motivo: "Certificado não configurado" });
    }

    const adapter = createFiscalAdapter(config, "NFE");
    if (!(adapter instanceof SefazNFeAdapter)) {
      return NextResponse.json({ online: null, motivo: "Adapter real não disponível" });
    }

    const status = await adapter.consultarStatus();
    return NextResponse.json(status);
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ online: false, motivo: String(error) });
  }
}
