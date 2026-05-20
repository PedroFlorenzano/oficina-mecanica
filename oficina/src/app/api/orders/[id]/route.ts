import { NextRequest, NextResponse } from "next/server";
import { container } from "@/infrastructure/container";
import { UpdateOrderStatus } from "@/application/use-cases/orders/UpdateOrderStatus";
import { handleError } from "@/lib/api-handler";

const DEMO_USER_ID = "demo-user";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const order = await container.orderRepository.findById(id);

  if (!order) {
    return NextResponse.json({ error: "OS não encontrada" }, { status: 404 });
  }

  return NextResponse.json(order);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const useCase = new UpdateOrderStatus(container.orderRepository);
    const updated = await useCase.execute(id, body.status, DEMO_USER_ID);
    return NextResponse.json(updated);
  } catch (error) {
    return handleError(error);
  }
}
