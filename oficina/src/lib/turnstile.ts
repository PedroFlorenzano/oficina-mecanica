import { ValidationError } from "@/domain/errors/DomainError";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Captcha Cloudflare Turnstile — gratuito e sem limite de uso.
 *
 * Só é exigido quando `TURNSTILE_SECRET_KEY` está configurada. Sem a variável,
 * a verificação é ignorada (dev, CI e ambientes sem as chaves continuam funcionando).
 */
export function isTurnstileEnabled(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY);
}

/** Mensagens específicas por código de erro da Cloudflare (facilita diagnóstico). */
function messageForCodes(codes: string[]): string {
  if (codes.includes("timeout-or-duplicate")) {
    return "A verificação de segurança expirou. Marque a verificação novamente e reenvie.";
  }
  if (codes.includes("invalid-input-secret") || codes.includes("bad-request")) {
    // Erro de configuração no servidor, não culpa do usuário
    return "Verificação de segurança indisponível por erro de configuração. Avise o suporte.";
  }
  const detail = codes.length > 0 ? ` (${codes.join(", ")})` : "";
  return `Verificação de segurança falhou${detail}. Recarregue a página e tente novamente.`;
}

export async function verifyTurnstile(token: unknown, ip?: string): Promise<void> {
  if (!isTurnstileEnabled()) return;

  if (typeof token !== "string" || token.trim() === "") {
    throw new ValidationError("Verificação de segurança não concluída. Recarregue a página e tente novamente.");
  }

  const body = new URLSearchParams({
    secret: process.env.TURNSTILE_SECRET_KEY!,
    response: token,
  });
  if (ip && ip !== "unknown") body.set("remoteip", ip);

  let outcome: { success?: boolean; "error-codes"?: string[] } = {};
  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    outcome = await res.json();
  } catch {
    // Indisponibilidade da Cloudflare não deve barrar cadastros legítimos:
    // o rate limit continua ativo como segunda camada.
    console.error("Turnstile: falha ao contatar a Cloudflare; verificação ignorada nesta requisição");
    return;
  }

  if (!outcome.success) {
    const codes = outcome["error-codes"] ?? [];
    console.error("Turnstile: validação recusada", codes);
    throw new ValidationError(messageForCodes(codes));
  }
}
