import { IStockItemRepository, StockItemData } from "@/domain/repositories/IStockItemRepository";
import { IStockMovementRepository } from "@/domain/repositories/IStockMovementRepository";
import { RegisterStockEntryDTO } from "@/application/dtos/RegisterStockEntryDTO";
import { ValidationError, NotFoundError } from "@/domain/errors/DomainError";

export class RegisterStockEntry {
  constructor(
    private stockItemRepo: IStockItemRepository,
    private movementRepo: IStockMovementRepository
  ) {}

  async execute(
    itemId: string,
    input: RegisterStockEntryDTO,
    _tenantId: string
  ): Promise<StockItemData> {
    if (!input.quantity || input.quantity <= 0) {
      throw new ValidationError("Quantidade deve ser maior que zero");
    }
    if (input.unitCost === undefined || input.unitCost < 0) {
      throw new ValidationError("Custo unitário não pode ser negativo");
    }

    const item = await this.stockItemRepo.findById(itemId);
    if (!item) throw new NotFoundError("Item não encontrado");

    const balanceBefore = item.quantity;
    const balanceAfter = balanceBefore + input.quantity;

    // Fórmula de custo médio ponderado
    const newAvgCost =
      balanceBefore === 0
        ? input.unitCost
        : Math.round(
            ((balanceBefore * item.avgCost + input.quantity * input.unitCost) / balanceAfter) * 100
          ) / 100;

    return this.stockItemRepo.createEntryTransaction(
      itemId,
      {
        type: "IN",
        quantity: input.quantity,
        reason: input.reason ?? "Entrada de estoque",
        document: input.document ?? null,
        supplier: input.supplier ?? null,
        unitCost: input.unitCost,
        orderId: null,
        balanceBefore,
        balanceAfter,
        stockItemId: itemId,
      },
      {
        quantity: balanceAfter,
        avgCost: newAvgCost,
        costPrice: newAvgCost,
      }
    ).then(async (result) => {
      // Recalcular prazo de OSs ativas que usam este item
      try {
        const { prisma } = await import("@/infrastructure/database/prisma");
        const { CalculateOrderDeadline } = await import("../orders/CalculateOrderDeadline");
        const activeOrders = await prisma.orderPart.findMany({
          where: { stockItemId: itemId, order: { status: { in: ["OPEN", "IN_PROGRESS", "WAITING_PART"] } } },
          select: { order: { select: { id: true, tenantId: true } } },
        });
        const deadlineUseCase = new CalculateOrderDeadline();
        for (const op of activeOrders) {
          await deadlineUseCase.execute(op.order.id, op.order.tenantId).catch(() => {});
        }
      } catch { /* não bloquear */ }
      return result;
    });
  }
}
