import { prisma } from "../database/prisma";
import { IStockItemRepository, StockItemData } from "@/domain/repositories/IStockItemRepository";

export class PrismaStockItemRepository implements IStockItemRepository {
  async findById(id: string): Promise<StockItemData | null> {
    return prisma.stockItem.findUnique({
      where: { id },
    }) as unknown as StockItemData | null;
  }

  async findByCode(code: string, tenantId: string): Promise<StockItemData | null> {
    return prisma.stockItem.findFirst({
      where: { code, tenantId },
    }) as unknown as StockItemData | null;
  }

  async findAll(tenantId: string): Promise<StockItemData[]> {
    return prisma.stockItem.findMany({
      where: { tenantId },
      orderBy: { description: "asc" },
    }) as unknown as StockItemData[];
  }

  async count(tenantId: string): Promise<number> {
    return prisma.stockItem.count({ where: { tenantId } });
  }

  async create(data: Omit<StockItemData, "id">): Promise<StockItemData> {
    return prisma.stockItem.create({ data }) as unknown as StockItemData;
  }

  async update(id: string, data: Partial<Omit<StockItemData, "id">>): Promise<StockItemData> {
    return prisma.stockItem.update({ where: { id }, data }) as unknown as StockItemData;
  }

  async delete(id: string): Promise<void> {
    await prisma.stockItem.delete({ where: { id } });
  }

  async countMovements(id: string): Promise<number> {
    return prisma.stockMovement.count({ where: { stockItemId: id } });
  }

  async countOrderParts(id: string): Promise<number> {
    return prisma.orderPart.count({ where: { stockItemId: id } });
  }
}
