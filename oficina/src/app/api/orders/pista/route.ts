import { NextResponse } from "next/server";
import { container } from "@/infrastructure/container";
import { GetPista } from "@/application/use-cases/orders/GetPista";

const DEMO_TENANT_ID = "demo-tenant";

export async function GET() {
  const useCase = new GetPista(container.orderRepository);
  const orders = await useCase.execute(DEMO_TENANT_ID);
  return NextResponse.json(orders);
}
