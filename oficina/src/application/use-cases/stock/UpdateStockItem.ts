import { IStockItemRepository, StockItemData } from "@/domain/repositories/IStockItemRepository";
import { ValidationError } from "@/domain/errors/DomainError";

export interface UpdateStockItemDTO {
  code?: string;
  barcode?: string;
  description: string;
  brand?: string;
  unit?: string;
  minQuantity?: number;
  quantity?: number;
  location?: string;
  costPrice?: number;
  sellPrice?: number;
  profitMargin?: number;
  active?: boolean;
}

export class UpdateStockItem {
  constructor(private stockRepo: IStockItemRepository) {}

  async execute(id: string, input: UpdateStockItemDTO): Promise<StockItemData> {
    if (!input.description) {
      throw new ValidationError("Descrição é obrigatória");
    }

    return this.stockRepo.update(id, {
      code: input.code || undefined,
      barcode: input.barcode || null,
      description: input.description,
      brand: input.brand || null,
      unit: input.unit || "UN",
      minQuantity: input.minQuantity != null ? Number(input.minQuantity) : 0,
      quantity: input.quantity != null ? Number(input.quantity) : 0,
      location: input.location || null,
      costPrice: input.costPrice != null ? Number(input.costPrice) : 0,
      sellPrice: input.sellPrice != null ? Number(input.sellPrice) : 0,
      profitMargin: input.profitMargin != null ? Number(input.profitMargin) : 0,
      active: input.active != null ? input.active : true,
    });
  }
}
