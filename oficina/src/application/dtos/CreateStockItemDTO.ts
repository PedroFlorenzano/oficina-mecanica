export interface CreateStockItemDTO {
  code?: string;
  barcode?: string;
  description: string;
  brand?: string;
  unit?: string;
  minQuantity?: number;
  quantity?: number;
  location?: string;
  supplier?: string;
  costPrice?: number;
  sellPrice?: number;
  profitMargin?: number;
  // Tributários
  ncm?: string;
  cfop?: string;
  cstA?: string;
  csosn?: string;
  cstB?: string;
  productUse?: string;
}
