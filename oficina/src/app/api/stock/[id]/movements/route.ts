import { NextRequest, NextResponse } from "next/server";
import { container } from "@/infrastructure/container";
import { handleError } from "@/lib/api-handler";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const pageParam = searchParams.get("page") ?? "1";
    const pageSizeParam = searchParams.get("pageSize") ?? "20";

    const page = parseInt(pageParam, 10);
    const pageSize = parseInt(pageSizeParam, 10);

    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1) {
      return NextResponse.json(
        { error: "Parâmetros de paginação inválidos" },
        { status: 400 }
      );
    }

    const item = await container.stockItemRepository.findById(id);
    if (!item) {
      return NextResponse.json({ error: "Item não encontrado" }, { status: 404 });
    }

    const result = await container.stockMovementRepository.findByStockItemId(id, page, pageSize);
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}
