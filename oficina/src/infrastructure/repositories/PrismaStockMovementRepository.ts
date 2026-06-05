import { PrismaClient, Prisma } from "@prisma/client";
import {
  IStockMovementRepository,
  PaginatedMovements,
  StockMovementData,
} from "@/domain/repositories/IStockMovementRepository";

export class PrismaStockMovementRepository implements IStockMovementRepository {
  // Defense in depth: RLS também filtra no banco
  constructor(private readonly db: PrismaClient) {}

  async create(data: Omit<StockMovementData, "id" | "createdAt">): Promise<StockMovementData> {
    return this.db.stockMovement.create({ data: data as Prisma.StockMovementUncheckedCreateInput }) as unknown as StockMovementData;
  }

  async findPendingReservations(orderId: string): Promise<StockMovementData[]> {
    const reservations = await this.db.stockMovement.findMany({
      where: { orderId, type: "RESERVED" },
    });

    const settled = await this.db.stockMovement.findMany({
      where: {
        orderId,
        type: { in: ["CONSUMPTION", "REVERSAL"] },
      },
    });

    const settledItemIds = new Set(settled.map((s) => s.stockItemId));
    return reservations.filter(
      (r) => !settledItemIds.has(r.stockItemId)
    ) as unknown as StockMovementData[];
  }

  async findByOrderId(orderId: string): Promise<StockMovementData[]> {
    return this.db.stockMovement.findMany({
      where: { orderId },
      orderBy: { createdAt: "asc" },
    }) as unknown as StockMovementData[];
  }

  async findByStockItemId(
    stockItemId: string,
    page: number,
    pageSize: number
  ): Promise<PaginatedMovements> {
    const [data, total] = await this.db.$transaction([
      this.db.stockMovement.findMany({
        where: { stockItemId },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.db.stockMovement.count({ where: { stockItemId } }),
    ]);
    return { data: data as unknown as StockMovementData[], total, page, pageSize };
  }

  // Sem update() nem delete() — imutabilidade garantida por interface
}
