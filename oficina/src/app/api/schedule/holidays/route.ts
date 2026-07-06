import { NextRequest, NextResponse } from "next/server";
import { handleError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/infrastructure/database/prisma";

export async function GET() {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;

    const config = await prisma.scheduleConfig.findUnique({
      where: { tenantId },
      include: { holidays: { orderBy: { date: "asc" } } },
    });

    return NextResponse.json(config?.holidays || []);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;

    const body = await request.json();
    const { date, name, recurring } = body;

    if (!date || !name) {
      return NextResponse.json({ error: "Data e nome são obrigatórios" }, { status: 400 });
    }

    // Garantir que existe ScheduleConfig
    let config = await prisma.scheduleConfig.findUnique({ where: { tenantId } });
    if (!config) {
      config = await prisma.scheduleConfig.create({ data: { tenantId } });
    }

    const holiday = await prisma.holiday.create({
      data: {
        date: new Date(date),
        name,
        recurring: recurring ?? false,
        configId: config.id,
      },
    });

    return NextResponse.json(holiday, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 });
    }

    await prisma.holiday.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
