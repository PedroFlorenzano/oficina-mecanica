import { IStockItemRepository, StockItemData } from "@/domain/repositories/IStockItemRepository";
import { CreateStockItemDTO } from "@/application/dtos/CreateStockItemDTO";
import { ConflictError, ValidationError } from "@/domain/errors/DomainError";

export class CreateStockItem {
  constructor(private stockRepo: IStockItemRepository) {}

  async execute(input: CreateStockItemDTO, tenantId: string): Promise<StockItemData> {
    if (!input.description) {
      throw new ValidationError("Descrição é obrigatória");
    }

    let itemCode = input.code;
    if (!itemCode) {
      const count = await this.stockRepo.count(tenantId);
      itemCode = `ITEM${String(count + 1).padStart(5, "0")}`;
    }

    const existing = await this.stockRepo.findByCode(itemCode, tenantId);
    if (existing) {
      throw new ConflictError("Já existe um item com este código");
    }

    const costPrice = input.costPrice ? Number(input.costPrice) : 0;

    return this.stockRepo.create({
      code: itemCode,
      barcode: input.barcode || null,
      description: input.description,
      brand: input.brand || null,
      unit: input.unit || "UN",
      minQuantity: input.minQuantity ? Number(input.minQuantity) : 0,
      quantity: input.quantity ? Number(input.quantity) : 0,
      location: input.location || null,
      supplier: input.supplier || null,
      costPrice,
      sellPrice: input.sellPrice ? Number(input.sellPrice) : 0,
      avgCost: costPrice,
      profitMargin: input.profitMargin ? Number(input.profitMargin) : 0,
      active: true,
      tenantId,
    });
  }
}
