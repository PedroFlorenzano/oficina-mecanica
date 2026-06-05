import { NextRequest, NextResponse } from "next/server";
import { adminContainer } from "@/infrastructure/container";

// BYPASSRLS: operação cross-tenant legítima — webhook recebe status de qualquer tenant

// Mapeamento de status da Evolution API para nosso enum
const STATUS_MAP: Record<string, string> = {
  DELIVERY_ACK: "DELIVERED",
  READ: "READ",
  PLAYED: "READ",
  SERVER_ACK: "SENT",
  ERROR: "FAILED",
  FAILED: "FAILED",
};

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || process.env.EVOLUTION_API_KEY || "";

// Rota pública — Evolution API envia webhook com apikey no header
export async function POST(request: NextRequest) {
  try {
    // Validar origem: verificar apikey header ou query param
    if (WEBHOOK_SECRET) {
      const apikey = request.headers.get("apikey") || request.nextUrl.searchParams.get("apikey");
      if (apikey !== WEBHOOK_SECRET) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else {
      // Se nenhum secret configurado, rejeitar por segurança
      return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
    }

    const body = await request.json();

    // Evolution API v2 envia evento "messages.update" com array de status
    const updates = body.data || [];
    if (!Array.isArray(updates)) {
      // Formato alternativo: evento único
      const key = body.data?.key?.id || body.key?.id;
      const status = body.data?.status || body.status;
      if (key && status) {
        await processUpdate(key, status);
      }
      return NextResponse.json({ ok: true });
    }

    for (const update of updates) {
      const messageId = update.key?.id || update.keyId;
      const status = update.status;
      if (messageId && status) {
        await processUpdate(messageId, status);
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true }); // Sempre 200 para não causar retry
  }
}

async function processUpdate(externalId: string, rawStatus: string) {
  const mappedStatus = STATUS_MAP[rawStatus] || STATUS_MAP[rawStatus?.toUpperCase()];
  if (!mappedStatus) return;

  const message = await adminContainer.whatsAppRepository.findByExternalId(externalId);
  if (!message) return;

  await adminContainer.whatsAppRepository.updateMessageStatus(message.id, mappedStatus);
}
