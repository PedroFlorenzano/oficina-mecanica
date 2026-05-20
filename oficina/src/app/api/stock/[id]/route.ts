import { NextRequest, NextResponse } from "next/server";
import { container } from "@/infrastructure/container";
import { UpdateStockItem } from "@/application/use-cases/stock/UpdateStockItem";
import { DeleteStockItem } from "@/application/use-cases/stock/DeleteStockItem";
import { handleError } from "@/lib/api-handler";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const item = await container.stockItemRepository.findById(id);

  if (!item) {
    return NextResponse.json({ error: "Item não encontrado" }, { status: 404 });
  }

  return NextResponse.json(item);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const useCase = new UpdateStockItem(container.stockItemRepository);
    const item = await useCase.execute(id, body);
    return NextResponse.json(item);
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const useCase = new DeleteStockItem(container.stockItemRepository);
    await useCase.execute(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error);
  }
}
