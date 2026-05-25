import { prisma } from "../database/prisma";
import { IStockItemRepository, StockItemData } from "@/domain/repositories/IStockItemRepository";
import { StockMovementData } from "@/domain/repositories/IStockMovementRepository";
import { BusinessRuleError } from "@/domain/errors/DomainError";

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

  async findLowStock(tenantId: string): Promise<StockItemData[]> {
    // Prisma não suporta comparação entre colunas — buscar ativos e filtrar em memória
    const items = await prisma.stockItem.findMany({
      where: { tenantId, active: true },
      orderBy: { description: "asc" },
    });
    return items.filter((item) => item.quantity <= item.minQuantity) as unknown as StockItemData[];
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

  async createEntryTransaction(
    itemId: string,
    movementData: Omit<StockMovementData, "id" | "createdAt">,
    itemUpdate: Partial<Omit<StockItemData, "id">>
  ): Promise<StockItemData> {
    if (movementData.balanceAfter < 0) {
      throw new BusinessRuleError("Saldo do estoque não pode ser negativo");
    }

    const [, updatedItem] = await prisma.$transaction([
      prisma.stockMovement.create({ data: movementData as any }),
      prisma.stockItem.update({ where: { id: itemId }, data: itemUpdate }),
    ]);

    return updatedItem as unknown as StockItemData;
  }
}
