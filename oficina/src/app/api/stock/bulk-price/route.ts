import { NextRequest, NextResponse } from "next/server";
import { createContainer } from "@/infrastructure/container";
import { BulkUpdateStockPrices } from "@/application/use-cases/stock/BulkUpdateStockPrices";
import { handleError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";

/**
 * Item 17 — atualização em massa de preços de estoque.
 * Restrito ao ADMIN (alteração de preço em lote é operação sensível).
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso restrito ao administrador" }, { status: 403 });
    }

    const container = createContainer(tenantId);
    const body = await request.json();

    const useCase = new BulkUpdateStockPrices(container.stockItemRepository);
    const result = await useCase.execute(
      {
        filter: {
          ids: Array.isArray(body.ids) ? body.ids : undefined,
          brand: typeof body.brand === "string" ? body.brand : undefined,
          term: typeof body.term === "string" ? body.term : undefined,
        },
        mode: body.mode,
        value: Number(body.value),
      },
      tenantId
    );

    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}
