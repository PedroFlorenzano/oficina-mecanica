export interface StockMovementData {
  id: string;
  type: "IN" | "OUT" | "RESERVED" | "CONSUMPTION" | "REVERSAL" | "ADJUSTMENT";
  quantity: number;
  reason: string;
  document: string | null;
  supplier: string | null;
  unitCost: number | null;
  orderId: string | null;
  balanceBefore: number;
  balanceAfter: number;
  stockItemId: string;
  createdAt: Date;
}

export interface PaginatedMovements {
  data: StockMovementData[];
  total: number;
  page: number;
  pageSize: number;
}

/** Item 19 — resumo consolidado de compras por fornecedor de um item */
export interface SupplierSummary {
  supplier: string;
  lastPurchase: Date;
  totalQuantity: number;
  avgCost: number;
  purchaseCount: number;
}

export interface IStockMovementRepository {
  create(data: Omit<StockMovementData, "id" | "createdAt">): Promise<StockMovementData>;
  findPendingReservations(orderId: string): Promise<StockMovementData[]>;
  findByOrderId(orderId: string): Promise<StockMovementData[]>;
  findByStockItemId(
    stockItemId: string,
    page: number,
    pageSize: number
  ): Promise<PaginatedMovements>;
  /** Movimentações de entrada (type IN) com fornecedor, para consolidação por fornecedor */
  findEntriesByStockItemId?(stockItemId: string): Promise<StockMovementData[]>;
  // Sem update() nem delete() — imutabilidade por design
}
