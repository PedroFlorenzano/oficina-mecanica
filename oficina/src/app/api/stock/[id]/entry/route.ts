import { NextRequest, NextResponse } from "next/server";
import { container } from "@/infrastructure/container";
import { RegisterStockEntry } from "@/application/use-cases/stock/RegisterStockEntry";
import { handleError } from "@/lib/api-handler";

const DEMO_TENANT_ID = "demo-tenant"; // TODO: integrar com auth — substituir por session.user.tenantId

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const useCase = new RegisterStockEntry(
      container.stockItemRepository,
      container.stockMovementRepository
    );
    const item = await useCase.execute(id, body, DEMO_TENANT_ID);
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
