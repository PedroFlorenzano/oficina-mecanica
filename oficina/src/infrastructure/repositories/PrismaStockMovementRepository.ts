import { prisma } from "../database/prisma";
import {
  IStockMovementRepository,
  PaginatedMovements,
  StockMovementData,
} from "@/domain/repositories/IStockMovementRepository";

export class PrismaStockMovementRepository implements IStockMovementRepository {
  async create(data: Omit<StockMovementData, "id" | "createdAt">): Promise<StockMovementData> {
    return prisma.stockMovement.create({ data: data as any }) as unknown as StockMovementData;
  }

  async findPendingReservations(orderId: string): Promise<StockMovementData[]> {
    // Reservas sem contrapartida de CONSUMPTION ou REVERSAL para a mesma OS e mesmo item
    const reservations = await prisma.stockMovement.findMany({
      where: { orderId, type: "RESERVED" },
    });

    const settled = await prisma.stockMovement.findMany({
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
    return prisma.stockMovement.findMany({
      where: { orderId },
      orderBy: { createdAt: "asc" },
    }) as unknown as StockMovementData[];
  }

  async findByStockItemId(
    stockItemId: string,
    page: number,
    pageSize: number
  ): Promise<PaginatedMovements> {
    const [data, total] = await prisma.$transaction([
      prisma.stockMovement.findMany({
        where: { stockItemId },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.stockMovement.count({ where: { stockItemId } }),
    ]);
    return { data: data as unknown as StockMovementData[], total, page, pageSize };
  }

  // Sem update() nem delete() — imutabilidade garantida por interface
}
