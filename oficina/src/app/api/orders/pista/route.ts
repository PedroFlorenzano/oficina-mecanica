import { NextRequest, NextResponse } from "next/server";
import { container } from "@/infrastructure/container";
import { GetPista } from "@/application/use-cases/orders/GetPista";
import { UpdatePistaStatus } from "@/application/use-cases/orders/UpdatePistaStatus";
import { handleError } from "@/lib/api-handler";

const DEMO_TENANT_ID = "demo-tenant";
const DEMO_USER_ID = "demo-user";

export async function GET() {
  const useCase = new GetPista(container.orderRepository);
  const orders = await useCase.execute(DEMO_TENANT_ID);
  return NextResponse.json(orders);
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const useCase = new UpdatePistaStatus(container.orderRepository);
    const updated = await useCase.execute(body.id, body.status, DEMO_USER_ID);
    return NextResponse.json(updated);
  } catch (error) {
    return handleError(error);
  }
}
