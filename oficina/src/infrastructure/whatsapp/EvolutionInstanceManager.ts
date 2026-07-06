const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || "";
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || "";

export interface CreateInstanceResult {
  success: boolean;
  instanceName?: string;
  instanceId?: string;
  hash?: string;
  qrcode?: string; // base64
  error?: string;
}

export interface ConnectionStateResult {
  state: "open" | "connecting" | "close";
  instanceName: string;
}

export interface QRCodeResult {
  success: boolean;
  qrcode?: string; // base64
  error?: string;
}

/**
 * Cria uma instância na Evolution API para um tenant.
 * A instância é criada com groupsIgnore=true (ignora grupos)
 * e rejectCall=true (rejeita ligações).
 */
export async function createEvolutionInstance(tenantSlug: string, webhookUrl?: string): Promise<CreateInstanceResult> {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    return { success: false, error: "Evolution API não configurada (variáveis de ambiente ausentes)" };
  }

  const instanceName = `operare-${tenantSlug}`;

  try {
    const body: Record<string, unknown> = {
      instanceName,
      qrcode: true,
      integration: "WHATSAPP-BAILEYS",
      rejectCall: true,
      msgCall: "No momento não atendemos ligações por este número. Envie uma mensagem de texto.",
      groupsIgnore: true,
      alwaysOnline: false,
      readMessages: false,
      readStatus: false,
    };

    if (webhookUrl) {
      body.webhook = {
        enabled: true,
        url: webhookUrl,
        byEvents: true,
        base64: false,
        events: ["CONNECTION_UPDATE", "MESSAGES_UPSERT"],
      };
    }

    const res = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: EVOLUTION_API_KEY,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      // Se a instância já existe, tenta conectar
      if (res.status === 403 || errorBody.includes("already")) {
        return { success: true, instanceName, hash: undefined, qrcode: undefined };
      }
      return { success: false, error: `Evolution API ${res.status}: ${errorBody}` };
    }

    const data = await res.json();
    return {
      success: true,
      instanceName: data.instance?.instanceName || instanceName,
      instanceId: data.instance?.instanceId,
      hash: data.hash,
      qrcode: data.qrcode?.base64,
    };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Erro de conexão" };
  }
}

/**
 * Busca o QR Code para conectar uma instância existente.
 */
export async function getInstanceQRCode(instanceName: string): Promise<QRCodeResult> {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    return { success: false, error: "Evolution API não configurada" };
  }

  try {
    const res = await fetch(`${EVOLUTION_API_URL}/instance/connect/${instanceName}`, {
      method: "GET",
      headers: { apikey: EVOLUTION_API_KEY },
    });

    if (!res.ok) {
      const errorBody = await res.text();
      return { success: false, error: `Evolution API ${res.status}: ${errorBody}` };
    }

    const data = await res.json();
    return { success: true, qrcode: data.qrcode?.base64 || data.base64 };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Erro de conexão" };
  }
}

/**
 * Verifica o estado de conexão de uma instância.
 */
export async function getConnectionState(instanceName: string): Promise<ConnectionStateResult> {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    return { state: "close", instanceName };
  }

  try {
    const res = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`, {
      method: "GET",
      headers: { apikey: EVOLUTION_API_KEY },
    });

    if (!res.ok) {
      return { state: "close", instanceName };
    }

    const data = await res.json();
    return { state: data.instance?.state || "close", instanceName };
  } catch {
    return { state: "close", instanceName };
  }
}

/**
 * Remove uma instância da Evolution API.
 */
export async function deleteEvolutionInstance(instanceName: string): Promise<{ success: boolean; error?: string }> {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    return { success: false, error: "Evolution API não configurada" };
  }

  try {
    const res = await fetch(`${EVOLUTION_API_URL}/instance/delete/${instanceName}`, {
      method: "DELETE",
      headers: { apikey: EVOLUTION_API_KEY },
    });

    return { success: res.ok };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Erro de conexão" };
  }
}
