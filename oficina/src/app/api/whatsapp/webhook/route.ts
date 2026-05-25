import { NextRequest, NextResponse } from "next/server";
import { container } from "@/infrastructure/container";

// Mapeamento de status da Evolution API para nosso enum
const STATUS_MAP: Record<string, string> = {
  DELIVERY_ACK: "DELIVERED",
  READ: "READ",
  PLAYED: "READ",
  SERVER_ACK: "SENT",
  ERROR: "FAILED",
  FAILED: "FAILED",
};

// Rota pública — Evolution API não envia auth headers
export async function POST(request: NextRequest) {
  try {
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

  const message = await container.whatsAppRepository.findByExternalId(externalId);
  if (!message) return;

  await container.whatsAppRepository.updateMessageStatus(message.id, mappedStatus);
}
