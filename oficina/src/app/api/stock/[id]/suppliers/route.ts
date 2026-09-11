import { NextResponse } from "next/server";
import { createContainer } from "@/infrastructure/container";
import { GetSupplierHistory } from "@/application/use-cases/stock/GetSupplierHistory";
import { handleError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";

/**
 * Item 19 — histórico consolidado de fornecedores de um item de estoque.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const container = createContainer(tenantId);
    const { id } = await params;

    const useCase = new GetSupplierHistory(
      container.stockItemRepository,
      container.stockMovementRepository
    );
    const summary = await useCase.execute(id, tenantId);

    return NextResponse.json(summary);
  } catch (error) {
    return handleError(error);
  }
}
