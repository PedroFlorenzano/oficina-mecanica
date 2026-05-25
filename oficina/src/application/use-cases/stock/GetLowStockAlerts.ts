import { IStockItemRepository, StockItemData } from "@/domain/repositories/IStockItemRepository";

export class GetLowStockAlerts {
  constructor(private stockItemRepo: IStockItemRepository) {}

  async execute(tenantId: string): Promise<StockItemData[]> {
    return this.stockItemRepo.findLowStock(tenantId);
  }
}
