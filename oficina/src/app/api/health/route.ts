import { NextRequest, NextResponse } from "next/server";
import { prismaAdmin } from "@/infrastructure/database/prisma";

/**
 * GET /api/health — verificação de saúde para monitoramento externo.
 *
 * Por padrão NÃO toca no banco. Motivo: o Neon (plano Free) hiberna o compute
 * após 5 min de inatividade e dá 100 CU-horas/mês. Um monitor consultando o
 * banco a cada 10 min manteria o compute acordado metade do mês (~90 CU-horas)
 * e estouraria a cota — o que suspende o banco até o ciclo seguinte.
 *
 * Use `?db=1` para incluir o banco (adequado para uma checagem diária).
 *
 * Público de propósito (um monitor não faz login), mas sem revelar host,
 * usuário, versão ou stack trace.
 */
export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  const checkDatabase = request.nextUrl.searchParams.get("db") === "1";

  if (!checkDatabase) {
    return NextResponse.json(
      { status: "ok", database: "not_checked" },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    await prismaAdmin.$queryRaw`SELECT 1`;
    return NextResponse.json(
      { status: "ok", database: "ok", latencyMs: Date.now() - startedAt },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { status: "degraded", database: "unreachable", latencyMs: Date.now() - startedAt },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
