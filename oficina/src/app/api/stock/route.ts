import { NextRequest, NextResponse } from "next/server";
import { container } from "@/infrastructure/container";
import { CreateStockItem } from "@/application/use-cases/stock/CreateStockItem";
import { handleError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;

    const items = await container.stockItemRepository.findAll(tenantId);
    return NextResponse.json(items);
  } catch (error) {
    if (error instanceof Response) return error;
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;

    const body = await request.json();
    const useCase = new CreateStockItem(container.stockItemRepository);
    const item = await useCase.execute(body, tenantId);
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    return handleError(error);
  }
}
