import { StockMovementData } from "./IStockMovementRepository";

export interface StockItemData {
  id: string;
  code: string;
  barcode: string | null;
  originalCode?: string | null;
  sku?: string | null;
  description: string;
  application?: string | null;
  observations?: string | null;
  brand: string | null;
  unit: string;
  minQuantity: number;
  quantity: number;
  location: string | null;
  supplier: string | null;
  supplierId?: string | null;
  leadTimeDays?: number | null;
  costPrice: number;
  sellPrice: number;
  avgCost: number;
  profitMargin: number | null;
  active: boolean;
  tenantId: string;
  // Tributários (opcionais)
  ncm?: string | null;
  cfop?: string | null;
  cstA?: string | null;
  csosn?: string | null;
  cstB?: string | null;
  productUse?: string | null;
}

export interface IStockItemRepository {
  findById(id: string): Promise<StockItemData | null>;
  findByCode(code: string, tenantId: string): Promise<StockItemData | null>;
  findAll(tenantId: string): Promise<StockItemData[]>;
  /** Busca por código, código original, SKU, código de barras, descrição, marca, aplicação ou localização */
  search(term: string, tenantId: string): Promise<StockItemData[]>;
  /** Peças cujo campo "aplicação" casa com marca/modelo do veículo */
  findByApplication(terms: string[], tenantId: string): Promise<StockItemData[]>;
  findLowStock(tenantId: string): Promise<StockItemData[]>;
  count(tenantId: string): Promise<number>;
  create(data: Omit<StockItemData, "id">): Promise<StockItemData>;
  update(id: string, data: Partial<Omit<StockItemData, "id">>): Promise<StockItemData>;
  delete(id: string): Promise<void>;
  countMovements(id: string): Promise<number>;
  countOrderParts(id: string): Promise<number>;
  createEntryTransaction(
    itemId: string,
    movementData: Omit<StockMovementData, "id" | "createdAt">,
    itemUpdate: Partial<Omit<StockItemData, "id">>
  ): Promise<StockItemData>;
}
