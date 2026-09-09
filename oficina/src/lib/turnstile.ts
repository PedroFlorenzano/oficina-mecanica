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

  let outcome: { success?: boolean } = {};
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
    throw new ValidationError("Verificação de segurança falhou. Recarregue a página e tente novamente.");
  }
}
