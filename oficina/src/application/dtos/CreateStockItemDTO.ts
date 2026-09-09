export interface CreateStockItemDTO {
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
