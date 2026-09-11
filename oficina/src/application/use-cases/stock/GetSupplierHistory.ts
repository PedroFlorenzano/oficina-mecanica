import { IStockItemRepository } from "@/domain/repositories/IStockItemRepository";
import {
  IStockMovementRepository,
  StockMovementData,
  SupplierSummary,
} from "@/domain/repositories/IStockMovementRepository";
import { NotFoundError } from "@/domain/errors/DomainError";

/**
 * Consolida movimentações de entrada por fornecedor — função pura e testável (item 19).
 *
 * Para cada fornecedor: última compra, quantidade total, custo médio ponderado
 * pela quantidade e número de compras. Ordena da compra mais recente para a mais antiga.
 */
export function consolidateSuppliers(entries: StockMovementData[]): SupplierSummary[] {
  const bySupplier = new Map<
    string,
    { totalQty: number; weightedCost: number; costQty: number; last: Date; count: number }
  >();

  for (const e of entries) {
    const supplier = (e.supplier ?? "").trim();
    if (!supplier) continue;

    const acc = bySupplier.get(supplier) ?? {
      totalQty: 0,
      weightedCost: 0,
      costQty: 0,
      last: e.createdAt,
      count: 0,
    };

    acc.totalQty += e.quantity;
    acc.count += 1;
    if (e.createdAt > acc.last) acc.last = e.createdAt;
    // Custo médio ponderado só considera entradas com custo informado
    if (e.unitCost != null) {
      acc.weightedCost += e.unitCost * e.quantity;
      acc.costQty += e.quantity;
    }

    bySupplier.set(supplier, acc);
  }

  const result: SupplierSummary[] = [];
  for (const [supplier, acc] of bySupplier) {
    result.push({
      supplier,
      lastPurchase: acc.last,
      totalQuantity: acc.totalQty,
      avgCost: acc.costQty > 0 ? Math.round((acc.weightedCost / acc.costQty) * 100) / 100 : 0,
      purchaseCount: acc.count,
    });
  }

  return result.sort((a, b) => b.lastPurchase.getTime() - a.lastPurchase.getTime());
}

/**
 * Item 19 — histórico consolidado de fornecedores por item de estoque.
 */
export class GetSupplierHistory {
  constructor(
    private stockRepo: IStockItemRepository,
    private movementRepo: IStockMovementRepository
  ) {}

  async execute(stockItemId: string, tenantId: string): Promise<SupplierSummary[]> {
    const item = await this.stockRepo.findById(stockItemId);
    if (!item || item.tenantId !== tenantId) {
      throw new NotFoundError("Item de estoque", stockItemId);
    }

    if (!this.movementRepo.findEntriesByStockItemId) {
      return [];
    }
    const entries = await this.movementRepo.findEntriesByStockItemId(stockItemId);
    return consolidateSuppliers(entries);
  }
}
