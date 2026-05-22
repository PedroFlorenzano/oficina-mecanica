import { NextRequest, NextResponse } from "next/server";
import { container } from "@/infrastructure/container";
import { RegisterStockEntry } from "@/application/use-cases/stock/RegisterStockEntry";
import { handleError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const { id } = await params;
    const body = await request.json();
    const useCase = new RegisterStockEntry(
      container.stockItemRepository,
      container.stockMovementRepository
    );
    const item = await useCase.execute(id, body, tenantId);
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    return handleError(error);
  }
}
