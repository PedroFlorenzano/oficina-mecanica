import { PrismaClient, Prisma } from "@prisma/client";
import { IStockItemRepository, StockItemData, BulkPriceFilter } from "@/domain/repositories/IStockItemRepository";
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

  async search(term: string, tenantId: string): Promise<StockItemData[]> {
    const q = term.trim();
    if (!q) return this.findAll(tenantId);

    const contains = { contains: q, mode: "insensitive" as const };
    return this.db.stockItem.findMany({
      where: {
        tenantId,
        OR: [
          { code: contains },
          { originalCode: contains },
          { sku: contains },
          { barcode: contains },
          { description: contains },
          { brand: contains },
          { application: contains },
          { location: contains },
        ],
      },
      orderBy: { description: "asc" },
    }) as unknown as StockItemData[];
  }

  async findByApplication(terms: string[], tenantId: string): Promise<StockItemData[]> {
    const cleaned = terms.map((t) => t.trim()).filter((t) => t.length >= 2);
    if (cleaned.length === 0) return [];

    return this.db.stockItem.findMany({
      where: {
        tenantId,
        active: true,
        OR: cleaned.map((t) => ({
          application: { contains: t, mode: "insensitive" as const },
        })),
      },
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

  async findForBulk(tenantId: string, filter: BulkPriceFilter): Promise<StockItemData[]> {
    // Ids explícitos têm precedência: filtra sempre por tenant (defense in depth)
    if (filter.ids && filter.ids.length > 0) {
      return this.db.stockItem.findMany({
        where: { tenantId, id: { in: filter.ids } },
        orderBy: { description: "asc" },
      }) as unknown as StockItemData[];
    }

    const where: Prisma.StockItemWhereInput = { tenantId };

    if (filter.brand && filter.brand.trim()) {
      where.brand = { equals: filter.brand.trim(), mode: "insensitive" };
    }

    if (filter.term && filter.term.trim()) {
      const contains = { contains: filter.term.trim(), mode: "insensitive" as const };
      where.OR = [
        { description: contains },
        { code: contains },
        { originalCode: contains },
        { sku: contains },
      ];
    }

    return this.db.stockItem.findMany({
      where,
      orderBy: { description: "asc" },
    }) as unknown as StockItemData[];
  }

  async bulkUpdatePrices(
    tenantId: string,
    updates: { id: string; sellPrice: number; profitMargin?: number | null }[]
  ): Promise<number> {
    if (updates.length === 0) return 0;

    const results = await this.db.$transaction(
      updates.map((u) =>
        this.db.stockItem.updateMany({
          // tenantId no where garante que só itens do tenant sejam alterados
          where: { id: u.id, tenantId },
          data:
            u.profitMargin !== undefined
              ? { sellPrice: u.sellPrice, profitMargin: u.profitMargin }
              : { sellPrice: u.sellPrice },
        })
      )
    );

    return results.reduce((sum, r) => sum + r.count, 0);
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
