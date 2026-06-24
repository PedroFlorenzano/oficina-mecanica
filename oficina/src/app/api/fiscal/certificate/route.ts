import { NextRequest, NextResponse } from "next/server";
import { createContainer } from "@/infrastructure/container";
import { handleError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";
import { CertificateManager } from "@/infrastructure/fiscal/CertificateManager";

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const container = createContainer(tenantId);
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });

    const body = await request.json();
    const { pfxBase64, password } = body;

    if (!pfxBase64 || !password) {
      return NextResponse.json({ error: "Certificado e senha são obrigatórios" }, { status: 400 });
    }

    // Validar o certificado
    const certManager = new CertificateManager();
    let certData;
    try {
      certData = certManager.load(pfxBase64, password);
    } catch {
      return NextResponse.json({ error: "Certificado inválido ou senha incorreta" }, { status: 400 });
    }

    if (certManager.isExpired()) {
      return NextResponse.json({ error: "Certificado expirado" }, { status: 400 });
    }

    // Salvar no FiscalConfig
    await container.fiscalRepository.upsertConfig(tenantId, {
      certificateBase64: pfxBase64,
      certificatePassword: password,
    });

    return NextResponse.json({
      cnpj: certData.cnpj,
      notAfter: certData.notAfter.toISOString(),
      message: "Certificado salvo com sucesso",
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return handleError(error);
  }
}
