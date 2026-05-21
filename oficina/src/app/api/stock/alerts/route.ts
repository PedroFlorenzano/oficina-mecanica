import { NextResponse } from "next/server";
import { container } from "@/infrastructure/container";
import { GetLowStockAlerts } from "@/application/use-cases/stock/GetLowStockAlerts";
import { handleError } from "@/lib/api-handler";

const DEMO_TENANT_ID = "demo-tenant"; // TODO: integrar com auth — substituir por session.user.tenantId

export async function GET() {
  try {
    const useCase = new GetLowStockAlerts(container.stockItemRepository);
    const items = await useCase.execute(DEMO_TENANT_ID);
    return NextResponse.json(items);
  } catch (error) {
    return handleError(error);
  }
}
