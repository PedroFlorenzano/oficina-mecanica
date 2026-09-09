import { NextResponse } from "next/server";
import { prismaAdmin } from "@/infrastructure/database/prisma";

/**
 * GET /api/health — verificação de saúde para monitoramento externo.
 *
 * Público de propósito (um monitor não faz login), mas não revela nada:
 * apenas se a aplicação responde e se o banco está acessível.
 * Retorna 503 quando o banco não responde, para o monitor acusar falha.
 */
export async function GET() {
  const startedAt = Date.now();

  try {
    await prismaAdmin.$queryRaw`SELECT 1`;
    return NextResponse.json(
      { status: "ok", database: "ok", latencyMs: Date.now() - startedAt },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    // Sem detalhes do erro: não expor host, usuário ou stack em endpoint público
    return NextResponse.json(
      { status: "degraded", database: "unreachable", latencyMs: Date.now() - startedAt },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
