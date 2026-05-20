export interface StockItemData {
  id: string;
  code: string;
  barcode: string | null;
  description: string;
  brand: string | null;
  unit: string;
  minQuantity: number;
  quantity: number;
  location: string | null;
  costPrice: number;
  sellPrice: number;
  avgCost: number;
  profitMargin: number | null;
  active: boolean;
  tenantId: string;
}

export interface IStockItemRepository {
  findById(id: string): Promise<StockItemData | null>;
  findByCode(code: string, tenantId: string): Promise<StockItemData | null>;
  findAll(tenantId: string): Promise<StockItemData[]>;
  count(tenantId: string): Promise<number>;
  create(data: Omit<StockItemData, "id">): Promise<StockItemData>;
  update(id: string, data: Partial<Omit<StockItemData, "id">>): Promise<StockItemData>;
  delete(id: string): Promise<void>;
  countMovements(id: string): Promise<number>;
  countOrderParts(id: string): Promise<number>;
}
