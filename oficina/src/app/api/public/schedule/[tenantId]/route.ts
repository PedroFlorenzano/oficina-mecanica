import { NextRequest, NextResponse } from "next/server";
import { prismaAdmin } from "@/infrastructure/database/prisma";
import { PrismaAppointmentRepository } from "@/infrastructure/repositories/PrismaAppointmentRepository";
import { GetAvailableSlots } from "@/application/use-cases/appointments/GetAvailableSlots";
import { CreateAppointment } from "@/application/use-cases/appointments/CreateAppointment";
import { handleError } from "@/lib/api-handler";
import { HOUR, enforceRateLimit, getClientIp } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";

function getRepo() {
  return new PrismaAppointmentRepository(prismaAdmin);
}

// GET /api/public/schedule/[tenantId]?date=2026-06-10
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const date = request.nextUrl.searchParams.get("date");
    if (!date) {
      return NextResponse.json({ error: "Parâmetro 'date' é obrigatório (YYYY-MM-DD)" }, { status: 400 });
    }

    const repo = getRepo();

    // Also return config for UI (business name, etc.)
    const config = await repo.getConfig(tenantId);
    if (!config?.enabled) {
      return NextResponse.json({ error: "Agendamento não disponível" }, { status: 404 });
    }

    const useCase = new GetAvailableSlots(repo);
    const slots = await useCase.execute(tenantId, date);

    // Get tenant name for the public page
    const tenant = await prismaAdmin.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, phone: true, address: true },
    });

    return NextResponse.json({ tenant, config: { workDays: config.workDays, slotDuration: config.slotDuration }, slots });
  } catch (error) {
    return handleError(error);
  }
}

// POST /api/public/schedule/[tenantId]
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const ip = getClientIp(request);
    const body = await request.json();

    // Captcha (só exigido se TURNSTILE_SECRET_KEY estiver configurada)
    await verifyTurnstile(body?.turnstileToken, ip);

    // Agendamento anônimo: limita spam por IP e protege a agenda da oficina
    await enforceRateLimit([
      {
        key: `schedule:ip:${ip}`,
        limit: 5,
        windowMs: HOUR,
        message: "Muitas solicitações de agendamento. Tente novamente em alguns minutos.",
      },
      {
        key: `schedule:tenant:${tenantId}`,
        limit: 60,
        windowMs: HOUR,
        message: "Agendamento online temporariamente indisponível. Entre em contato com a oficina por telefone.",
      },
    ]);

    const repo = getRepo();
    const useCase = new CreateAppointment(repo);
    const appointment = await useCase.execute(body, tenantId);

    return NextResponse.json(appointment, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
