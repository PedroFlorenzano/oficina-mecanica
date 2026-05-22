import { NextRequest, NextResponse } from "next/server";
import { handleError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/infrastructure/database/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const tenantId = session.user.tenantId;

    const order = await prisma.serviceOrder.findFirst({
      where: { id, tenantId },
      include: {
        vehicle: { select: { plate: true, brand: true, model: true } },
        tenant: { select: { name: true, phone: true } },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "OS não encontrada" }, { status: 404 });
    }

    const currentDate = order.createdAt;
    const nextDate = new Date(currentDate);
    nextDate.setMonth(nextDate.getMonth() + 6);

    const nextKm = order.mileage + 10000;

    return NextResponse.json({
      shopName: order.tenant.name,
      shopPhone: order.tenant.phone,
      vehicle: `${order.vehicle.brand} ${order.vehicle.model}`,
      plate: order.vehicle.plate,
      currentKm: order.mileage,
      nextKm,
      currentDate: currentDate.toISOString(),
      nextDate: nextDate.toISOString(),
      orderNumber: order.number,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return handleError(error);
  }
}
