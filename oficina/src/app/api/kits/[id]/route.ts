import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { handleError } from "@/lib/api-handler";
import { prismaAdmin } from "@/infrastructure/database/prisma";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso restrito a administradores" }, { status: 403 });
    }

    const { id } = await params;
    const tenantId = session.user.tenantId;
    const body = await request.json();

    // Verify ownership
    const existing = await prismaAdmin.kit.findFirst({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: "Kit não encontrado" }, { status: 404 });

    // Update: delete old items and recreate
    await prismaAdmin.kitItem.deleteMany({ where: { kitId: id } });

    const kit = await prismaAdmin.kit.update({
      where: { id },
      data: {
        name: body.name?.trim() || existing.name,
        description: body.description ?? existing.description,
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

    return NextResponse.json(kit);
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso restrito a administradores" }, { status: 403 });
    }

    const { id } = await params;
    const tenantId = session.user.tenantId;

    const existing = await prismaAdmin.kit.findFirst({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: "Kit não encontrado" }, { status: 404 });

    await prismaAdmin.kit.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error);
  }
}
