import { NextRequest, NextResponse } from "next/server";
import { CalculateOrderDeadline } from "@/application/use-cases/orders/CalculateOrderDeadline";
import { handleError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const { id } = await params;

    const useCase = new CalculateOrderDeadline();
    const result = await useCase.execute(id, tenantId);

    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const { id } = await params;

    // Retorna dados de prazo salvos (sem recalcular)
    const { prisma } = await import("@/infrastructure/database/prisma");
    const order = await prisma.serviceOrder.findFirst({
      where: { id, tenantId },
      select: {
        estimatedDelivery: true,
        estimatedDaysTotal: true,
        estimatedDaysReason: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "OS não encontrada" }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error) {
    return handleError(error);
  }
}
