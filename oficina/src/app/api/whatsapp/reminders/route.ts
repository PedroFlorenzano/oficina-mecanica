import { NextRequest, NextResponse } from "next/server";
import { container } from "@/infrastructure/container";
import { SendOilChangeReminders } from "@/application/use-cases/whatsapp/SendOilChangeReminders";

const CRON_SECRET = process.env.CRON_SECRET || "";
const DEMO_TENANT_ID = "demo-tenant";

// GET /api/whatsapp/reminders — chamado por scheduler externo (Vercel Cron, crontab, etc.)
export async function GET(request: NextRequest) {
  // Proteção simples: verificar secret via header ou query param
  const authHeader = request.headers.get("authorization");
  const secret = request.nextUrl.searchParams.get("secret");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}` && secret !== CRON_SECRET) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const useCase = new SendOilChangeReminders(
    container.vehicleRepository,
    container.orderRepository,
    container.whatsAppRepository,
  );

  const result = await useCase.execute(DEMO_TENANT_ID);
  return NextResponse.json(result);
}
