import { NextResponse } from "next/server";
import { createContainer } from "@/infrastructure/container";
import { GetLowStockAlerts } from "@/application/use-cases/stock/GetLowStockAlerts";
import { handleError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const container = createContainer(tenantId);

    const useCase = new GetLowStockAlerts(container.stockItemRepository);
    const items = await useCase.execute(tenantId);
    return NextResponse.json(items);
  } catch (error) {
    return handleError(error);
  }
}
