import { NextRequest, NextResponse } from "next/server";
import { container } from "@/infrastructure/container";
import { CreateOrder } from "@/application/use-cases/orders/CreateOrder";
import { handleError } from "@/lib/api-handler";

const DEMO_TENANT_ID = "demo-tenant";
const DEMO_USER_ID = "demo-user";

export async function GET() {
  const orders = await container.orderRepository.findAll(DEMO_TENANT_ID);
  return NextResponse.json(orders);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const useCase = new CreateOrder(container.orderRepository, container.vehicleRepository);
    const order = await useCase.execute(body, DEMO_TENANT_ID, DEMO_USER_ID);
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
