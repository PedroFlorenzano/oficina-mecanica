import { IStockItemRepository, StockItemData } from "@/domain/repositories/IStockItemRepository";
import { IStockMovementRepository } from "@/domain/repositories/IStockMovementRepository";
import { AdjustInventoryDTO } from "@/application/dtos/AdjustInventoryDTO";
import { ValidationError, NotFoundError } from "@/domain/errors/DomainError";

export class AdjustInventory {
  constructor(
    private stockItemRepo: IStockItemRepository,
    private movementRepo: IStockMovementRepository
  ) {}

  async execute(
    itemId: string,
    input: AdjustInventoryDTO,
    _tenantId: string
  ): Promise<StockItemData> {
    if (input.newQuantity === undefined || input.newQuantity < 0) {
      throw new ValidationError("Quantidade não pode ser negativa");
    }
    if (!input.reason || input.reason.trim() === "") {
      throw new ValidationError("Motivo do ajuste é obrigatório");
    }

    const item = await this.stockItemRepo.findById(itemId);
    if (!item) throw new NotFoundError("Item não encontrado");

    const balanceBefore = item.quantity;
    const balanceAfter = input.newQuantity;

    return this.stockItemRepo.createEntryTransaction(
      itemId,
      {
        type: "ADJUSTMENT",
        quantity: Math.abs(balanceAfter - balanceBefore),
        reason: input.reason.trim(),
        document: null,
        supplier: null,
        unitCost: item.avgCost,
        orderId: null,
        balanceBefore,
        balanceAfter,
        stockItemId: itemId,
      },
      { quantity: balanceAfter }
    );
  }
}
