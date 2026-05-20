export interface CreateStockItemDTO {
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
}
