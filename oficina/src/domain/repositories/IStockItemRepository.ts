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

/** Critério de seleção para atualização de preços em lote (item 17) */
export interface BulkPriceFilter {
  /** Lista explícita de ids — tem precedência sobre os demais filtros */
  ids?: string[];
  /** Casa com a marca (case-insensitive, igualdade exata) */
  brand?: string;
  /** Trecho que casa com descrição OU código/código original/SKU (case-insensitive) */
  term?: string;
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
  /** Seleciona itens ativos do tenant para operações em lote (marca, trecho de descrição/código ou ids) */
  findForBulk?(tenantId: string, filter: BulkPriceFilter): Promise<StockItemData[]>;
  /** Atualiza sellPrice (e opcionalmente profitMargin) de vários itens numa transação. Retorna a quantidade afetada. */
  bulkUpdatePrices?(
    tenantId: string,
    updates: { id: string; sellPrice: number; profitMargin?: number | null }[]
  ): Promise<number>;
  createEntryTransaction(
    itemId: string,
    movementData: Omit<StockMovementData, "id" | "createdAt">,
    itemUpdate: Partial<Omit<StockItemData, "id">>
  ): Promise<StockItemData>;
}
