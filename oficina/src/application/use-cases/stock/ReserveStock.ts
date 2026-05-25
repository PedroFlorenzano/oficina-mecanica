import { IStockItemRepository } from "@/domain/repositories/IStockItemRepository";
import { IStockMovementRepository } from "@/domain/repositories/IStockMovementRepository";
import { NotFoundError, BusinessRuleError } from "@/domain/errors/DomainError";

export class ReserveStock {
  constructor(
    private stockItemRepo: IStockItemRepository,
    private movementRepo: IStockMovementRepository
  ) {}

  async execute(
    stockItemId: string,
    quantity: number,
    orderId: string,
    tenantId: string
  ) {
    const item = await this.stockItemRepo.findById(stockItemId);
    if (!item || item.tenantId !== tenantId) {
      throw new NotFoundError("Item de estoque não encontrado");
    }

    if (item.quantity < quantity) {
      throw new BusinessRuleError(
        `Saldo insuficiente: disponível ${item.quantity}, solicitado ${quantity}`
      );
    }

    const balanceBefore = item.quantity;
    const balanceAfter = balanceBefore - quantity;

    // TODO: implementar SELECT FOR UPDATE via transação Prisma
    await this.movementRepo.create({
      type: "RESERVED",
      quantity,
      reason: `Reserva para OS ${orderId}`,
      orderId,
      balanceBefore,
      balanceAfter,
      stockItemId,
      document: null,
      supplier: null,
      unitCost: item.avgCost,
    });

    await this.stockItemRepo.update(stockItemId, { quantity: balanceAfter });

    return { stockItemId, reserved: quantity, balanceAfter };
  }
}
