import { NextRequest, NextResponse } from "next/server";
import { createContainer } from "@/infrastructure/container";
import { requireAuth } from "@/lib/auth";
import { handleError } from "@/lib/api-handler";
import { CreateOrder } from "@/application/use-cases/orders/CreateOrder";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const container = createContainer(tenantId);
    const { id } = await params;

    const original = await container.orderRepository.findById(id);
    if (!original) {
      return NextResponse.json({ error: "OS não encontrada" }, { status: 404 });
    }

    // Montar DTO de criação baseado na OS original
    const complaints = original.complaints.map((c) => ({
      description: c.description,
      services: c.services.map((s) => ({
        description: s.description,
        price: s.price,
        timeMinutes: s.timeMinutes || undefined,
        serviceId: s.serviceId || undefined,
        mechanicId: s.mechanicId || undefined,
        commissionRate: (s as { commissionRate?: number | null }).commissionRate ?? undefined,
      })),
      parts: c.parts.map((p) => ({
        description: p.description,
        quantity: p.quantity,
        unitPrice: p.unitPrice,
        stockItemId: p.stockItemId || undefined,
      })),
    }));

    const dto = {
      clientId: original.clientId,
      vehicleId: original.vehicleId,
      mileage: original.mileage,
      notes: `Duplicada da OS #${original.number}`,
      complaints,
    };

    const useCase = new CreateOrder(
      container.orderRepository,
      container.vehicleRepository
    );
    const result = await useCase.execute(dto, tenantId, session.user.userId);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
