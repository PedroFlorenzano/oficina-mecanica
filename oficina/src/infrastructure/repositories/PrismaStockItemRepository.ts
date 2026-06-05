import { PrismaClient, Prisma } from "@prisma/client";
import { IStockItemRepository, StockItemData } from "@/domain/repositories/IStockItemRepository";
import { StockMovementData } from "@/domain/repositories/IStockMovementRepository";
import { BusinessRuleError } from "@/domain/errors/DomainError";

export class PrismaStockItemRepository implements IStockItemRepository {
  // Defense in depth: RLS também filtra no banco
  constructor(private readonly db: PrismaClient) {}

  async findById(id: string): Promise<StockItemData | null> {
    return this.db.stockItem.findUnique({
      where: { id },
    }) as unknown as StockItemData | null;
  }

  async findByCode(code: string, tenantId: string): Promise<StockItemData | null> {
    return this.db.stockItem.findFirst({
      where: { code, tenantId },
    }) as unknown as StockItemData | null;
  }

  async findAll(tenantId: string): Promise<StockItemData[]> {
    return this.db.stockItem.findMany({
      where: { tenantId },
      orderBy: { description: "asc" },
    }) as unknown as StockItemData[];
  }

  async findLowStock(tenantId: string): Promise<StockItemData[]> {
    const items = await this.db.stockItem.findMany({
      where: { tenantId, active: true },
      orderBy: { description: "asc" },
    });
    return items.filter((item) => item.quantity <= item.minQuantity) as unknown as StockItemData[];
  }

  async count(tenantId: string): Promise<number> {
    return this.db.stockItem.count({ where: { tenantId } });
  }

  async create(data: Omit<StockItemData, "id">): Promise<StockItemData> {
    return this.db.stockItem.create({ data }) as unknown as StockItemData;
  }

  async update(id: string, data: Partial<Omit<StockItemData, "id">>): Promise<StockItemData> {
    return this.db.stockItem.update({ where: { id }, data }) as unknown as StockItemData;
  }

  async delete(id: string): Promise<void> {
    await this.db.stockItem.delete({ where: { id } });
  }

  async countMovements(id: string): Promise<number> {
    return this.db.stockMovement.count({ where: { stockItemId: id } });
  }

  async countOrderParts(id: string): Promise<number> {
    return this.db.orderPart.count({ where: { stockItemId: id } });
  }

  async createEntryTransaction(
    itemId: string,
    movementData: Omit<StockMovementData, "id" | "createdAt">,
    itemUpdate: Partial<Omit<StockItemData, "id">>
  ): Promise<StockItemData> {
    if (movementData.balanceAfter < 0) {
      throw new BusinessRuleError("Saldo do estoque não pode ser negativo");
    }

    const [, updatedItem] = await this.db.$transaction([
      this.db.stockMovement.create({ data: movementData as Prisma.StockMovementUncheckedCreateInput }),
      this.db.stockItem.update({ where: { id: itemId }, data: itemUpdate }),
    ]);

    return updatedItem as unknown as StockItemData;
  }
}
