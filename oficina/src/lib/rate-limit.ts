import { NextRequest } from "next/server";
import { prismaAdmin } from "@/infrastructure/database/prisma";
import { RateLimitError } from "@/domain/errors/DomainError";

/**
 * Rate limit para endpoints públicos (sem autenticação).
 *
 * Persistido no Postgres de propósito: em ambiente serverless cada invocação pode
 * rodar em uma instância diferente, então contador em memória não protege nada.
 * Usa `prismaAdmin` porque a tabela não pertence a nenhum tenant.
 */

export interface RateLimitRule {
  /** Identificador do limite. Ex.: "register:ip:203.0.113.10" */
  key: string;
  /** Máximo de requisições permitidas dentro da janela */
  limit: number;
  /** Tamanho da janela em milissegundos */
  windowMs: number;
  /** Mensagem exibida ao usuário quando o limite é atingido */
  message: string;
}

export const MINUTE = 60 * 1000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

/**
 * IP do cliente. Na Vercel o IP real vem em `x-forwarded-for`
 * (primeiro item da lista). Fallback para "unknown" mantém o limite funcionando
 * de forma agregada em vez de liberar a requisição.
 */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * Verifica as regras e registra o acesso. Lança `RateLimitError` na primeira
 * regra estourada — nada é registrado quando o limite é atingido, para que uma
 * rajada de tentativas bloqueadas não estenda a punição indefinidamente.
 */
export async function enforceRateLimit(rules: RateLimitRule[]): Promise<void> {
  const now = Date.now();

  for (const rule of rules) {
    const windowStart = new Date(now - rule.windowMs);

    const hits = await prismaAdmin.rateLimitHit.count({
      where: { key: rule.key, createdAt: { gte: windowStart } },
    });

    if (hits >= rule.limit) {
      const oldest = await prismaAdmin.rateLimitHit.findFirst({
        where: { key: rule.key, createdAt: { gte: windowStart } },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      });

      const retryAfterMs = oldest
        ? Math.max(1000, oldest.createdAt.getTime() + rule.windowMs - now)
        : rule.windowMs;

      throw new RateLimitError(rule.message, Math.ceil(retryAfterMs / 1000));
    }
  }

  await prismaAdmin.rateLimitHit.createMany({
    data: rules.map((rule) => ({ key: rule.key })),
  });

  // Limpeza oportunista (~2% das chamadas) para a tabela não crescer sem limite
  if (Math.random() < 0.02) {
    await prismaAdmin.rateLimitHit
      .deleteMany({ where: { createdAt: { lt: new Date(now - 7 * DAY) } } })
      .catch(() => { /* limpeza é best-effort, não deve derrubar a requisição */ });
  }
}
