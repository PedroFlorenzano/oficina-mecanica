import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { handleError } from "@/lib/api-handler";
import { prismaAdmin } from "@/infrastructure/database/prisma";

export async function GET() {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;

    const kits = await prismaAdmin.kit.findMany({
      where: { tenantId },
      include: { items: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(kits);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso restrito a administradores" }, { status: 403 });
    }

    const tenantId = session.user.tenantId;
    const body = await request.json();

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Nome do kit é obrigatório" }, { status: 400 });
    }

    const kit = await prismaAdmin.kit.create({
      data: {
        name: body.name.trim(),
        description: body.description || null,
        tenantId,
        items: {
          create: (body.items || []).map((item: { type: string; description: string; serviceId?: string; price?: number; timeMinutes?: number; stockItemId?: string; quantity?: number; unitPrice?: number }) => ({
            type: item.type,
            description: item.description,
            serviceId: item.serviceId || null,
            price: item.price || 0,
            timeMinutes: item.timeMinutes || 0,
            stockItemId: item.stockItemId || null,
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice || 0,
          })),
        },
      },
      include: { items: true },
    });

    return NextResponse.json(kit, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
