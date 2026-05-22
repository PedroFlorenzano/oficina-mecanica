import { IStockItemRepository, StockItemData } from "@/domain/repositories/IStockItemRepository";

export class GetLowStockAlerts {
  constructor(private stockItemRepo: IStockItemRepository) {}

  async execute(tenantId: string): Promise<StockItemData[]> {
    // TODO: integrar com auth — tenantId virá do usuário autenticado (NextAuth session)
    return this.stockItemRepo.findLowStock(tenantId);
  }
}
