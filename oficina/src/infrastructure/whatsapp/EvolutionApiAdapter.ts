const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || "";
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || "";
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || "";

export interface SendTextResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendText(to: string, text: string): Promise<SendTextResult> {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !EVOLUTION_INSTANCE) {
    return { success: false, error: "Evolution API não configurada (variáveis de ambiente ausentes)" };
  }

  // Normalizar número: remover tudo que não é dígito e garantir código do país
  let number = to.replace(/\D/g, "");
  if (!number.startsWith("55")) {
    number = "55" + number;
  }

  try {
    const res = await fetch(`${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: EVOLUTION_API_KEY,
      },
      body: JSON.stringify({ number, text, linkPreview: true }),
    });

    if (!res.ok) {
      const body = await res.text();
      return { success: false, error: `Evolution API ${res.status}: ${body}` };
    }

    const data = await res.json();
    return { success: true, messageId: data.key?.id };
  } catch (err: any) {
    return { success: false, error: err.message || "Erro de conexão com Evolution API" };
  }
}
