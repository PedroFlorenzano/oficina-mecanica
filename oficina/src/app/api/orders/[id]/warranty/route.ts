import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { handleError } from "@/lib/api-handler";
import { checkWarranty } from "@/application/use-cases/orders/CheckWarranty";
import { prisma } from "@/infrastructure/database/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const { id } = await params;

    const order = await prisma.serviceOrder.findFirst({
      where: { id, tenantId },
      select: { vehicleId: true },
    });

    if (!order) {
      return NextResponse.json({ error: "OS não encontrada" }, { status: 404 });
    }

    const alerts = await checkWarranty(order.vehicleId, tenantId);
    return NextResponse.json(alerts);
  } catch (error) {
    if (error instanceof Response) return error;
    return handleError(error);
  }
}
