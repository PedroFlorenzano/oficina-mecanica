export interface StockMovementData {
  id: string;
  type: "IN" | "OUT" | "RESERVED" | "CONSUMPTION" | "REVERSAL" | "ADJUSTMENT";
  quantity: number;
  reason: string;
  document: string | null;
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

export interface IStockMovementRepository {
  create(data: Omit<StockMovementData, "id" | "createdAt">): Promise<StockMovementData>;
  findPendingReservations(orderId: string): Promise<StockMovementData[]>;
  findByOrderId(orderId: string): Promise<StockMovementData[]>;
  findByStockItemId(
    stockItemId: string,
    page: number,
    pageSize: number
  ): Promise<PaginatedMovements>;
  // Sem update() nem delete() — imutabilidade por design
}
