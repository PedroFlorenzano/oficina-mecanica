import { IStockItemRepository } from "@/domain/repositories/IStockItemRepository";
import { IStockMovementRepository } from "@/domain/repositories/IStockMovementRepository";

export class ReverseStockReservations {
  constructor(
    private stockItemRepo: IStockItemRepository,
    private movementRepo: IStockMovementRepository
  ) {}

  async execute(orderId: string): Promise<void> {
    const pendingReservations = await this.movementRepo.findPendingReservations(orderId);
    if (pendingReservations.length === 0) return;

    for (const reservation of pendingReservations) {
      const item = await this.stockItemRepo.findById(reservation.stockItemId);
      if (!item) continue;

      const balanceBefore = item.quantity;
      const balanceAfter = balanceBefore + reservation.quantity;

      await this.movementRepo.create({
        type: "REVERSAL",
        quantity: reservation.quantity,
        reason: `Estorno de reserva — OS ${orderId}`,
        orderId,
        balanceBefore,
        balanceAfter,
        stockItemId: reservation.stockItemId,
        document: null,
        supplier: null,
        unitCost: reservation.unitCost ?? item.avgCost,
      });

      await this.stockItemRepo.update(reservation.stockItemId, {
        quantity: balanceAfter,
      });
    }
  }
}
