import { NextRequest, NextResponse } from "next/server";
import { adminContainer } from "@/infrastructure/container";
import { prismaAdmin } from "@/infrastructure/database/prisma";
import { SendOilChangeReminders } from "@/application/use-cases/whatsapp/SendOilChangeReminders";

// BYPASSRLS: operação cross-tenant legítima — cron verifica todos os tenants
const CRON_SECRET = process.env.CRON_SECRET || "";

/**
 * GET /api/whatsapp/reminders — lembrete de troca de óleo.
 *
 * Chamado pelo Vercel Cron (que envia `Authorization: Bearer $CRON_SECRET`
 * automaticamente) ou por qualquer scheduler externo via `?secret=`.
 *
 * Processa TODAS as oficinas ativas: cada uma só recebe envio se tiver o
 * lembrete habilitado na própria configuração de WhatsApp.
 */
export async function GET(request: NextRequest) {
  // Proteção: rejeitar se CRON_SECRET não estiver configurado
  if (!CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET não configurado" }, { status: 503 });
  }

  // Verificar secret via header ou query param
  const authHeader = request.headers.get("authorization");
  const secret = request.nextUrl.searchParams.get("secret");
  if (authHeader !== `Bearer ${CRON_SECRET}` && secret !== CRON_SECRET) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const tenants = await prismaAdmin.tenant.findMany({
    where: { active: true, billingStatus: { in: ["active", "past_due"] } },
    select: { id: true, name: true },
  });

  const useCase = new SendOilChangeReminders(
    adminContainer.vehicleRepository,
    adminContainer.orderRepository,
    adminContainer.whatsAppRepository,
  );

  let sent = 0;
  let skipped = 0;
  const failures: { tenant: string; error: string }[] = [];

  // Falha em uma oficina não deve impedir o envio das outras
  for (const tenant of tenants) {
    try {
      const result = await useCase.execute(tenant.id);
      sent += result.sent;
      skipped += result.skipped;
    } catch (error) {
      failures.push({
        tenant: tenant.name,
        error: error instanceof Error ? error.message : "erro desconhecido",
      });
    }
  }

  return NextResponse.json({
    tenantsProcessed: tenants.length,
    sent,
    skipped,
    failures: failures.length > 0 ? failures : undefined,
  });
}
