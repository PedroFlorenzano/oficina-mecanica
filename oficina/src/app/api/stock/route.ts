import { NextRequest, NextResponse } from "next/server";
import { container } from "@/infrastructure/container";
import { CreateStockItem } from "@/application/use-cases/stock/CreateStockItem";
import { handleError } from "@/lib/api-handler";

const DEMO_TENANT_ID = "demo-tenant";

export async function GET() {
  const items = await container.stockItemRepository.findAll(DEMO_TENANT_ID);
  return NextResponse.json(items);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const useCase = new CreateStockItem(container.stockItemRepository);
    const item = await useCase.execute(body, DEMO_TENANT_ID);
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
