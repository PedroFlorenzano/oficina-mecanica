import { IStockItemRepository, StockItemData } from "@/domain/repositories/IStockItemRepository";
import { ValidationError } from "@/domain/errors/DomainError";

export interface UpdateStockItemDTO {
  code?: string;
  barcode?: string;
  originalCode?: string;
  sku?: string;
  description: string;
  application?: string;
  observations?: string;
  brand?: string;
  unit?: string;
  minQuantity?: number;
  quantity?: number;
  location?: string;
  supplier?: string;
  supplierId?: string;
  leadTimeDays?: number | string;
  costPrice?: number;
  sellPrice?: number;
  profitMargin?: number;
  active?: boolean;
  // Tributários
  ncm?: string;
  cfop?: string;
  cstA?: string;
  csosn?: string;
  cstB?: string;
  productUse?: string;
}

export class UpdateStockItem {
  constructor(private stockRepo: IStockItemRepository) {}

  async execute(id: string, input: UpdateStockItemDTO): Promise<StockItemData> {
    if (!input.description) {
      throw new ValidationError("Descrição é obrigatória");
    }

    const leadTimeDays =
      input.leadTimeDays !== undefined && input.leadTimeDays !== null && `${input.leadTimeDays}` !== ""
        ? Number(input.leadTimeDays)
        : null;

    return this.stockRepo.update(id, {
      code: input.code || undefined,
      barcode: input.barcode || null,
      originalCode: input.originalCode || null,
      sku: input.sku || null,
      description: input.description,
      application: input.application || null,
      observations: input.observations || null,
      brand: input.brand || null,
      unit: input.unit || "UN",
      minQuantity: input.minQuantity != null ? Number(input.minQuantity) : 0,
      quantity: input.quantity != null ? Number(input.quantity) : 0,
      location: input.location || null,
      supplier: input.supplier || null,
      supplierId: input.supplierId || null,
      leadTimeDays,
      costPrice: input.costPrice != null ? Number(input.costPrice) : 0,
      sellPrice: input.sellPrice != null ? Number(input.sellPrice) : 0,
      profitMargin: input.profitMargin != null ? Number(input.profitMargin) : 0,
      active: input.active != null ? input.active : true,
      ncm: input.ncm || null,
      cfop: input.cfop || null,
      cstA: input.cstA || null,
      csosn: input.csosn || null,
      cstB: input.cstB || null,
      productUse: input.productUse || null,
    });
  }
}
