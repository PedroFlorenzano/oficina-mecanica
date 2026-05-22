import { NextRequest, NextResponse } from "next/server";
import { container } from "@/infrastructure/container";
import { AdjustInventory } from "@/application/use-cases/stock/AdjustInventory";
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
    const useCase = new AdjustInventory(
      container.stockItemRepository,
      container.stockMovementRepository
    );
    const item = await useCase.execute(id, body, tenantId);
    return NextResponse.json(item);
  } catch (error) {
    if (error instanceof Response) return error;
    return handleError(error);
  }
}
