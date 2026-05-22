import { prisma } from "@/infrastructure/database/prisma";
import { IStockItemRepository } from "@/domain/repositories/IStockItemRepository";
import { IStockMovementRepository } from "@/domain/repositories/IStockMovementRepository";
import { ReverseStockReservations } from "@/application/use-cases/stock/ReverseStockReservations";

export class ConfirmStockConsumption {
  constructor(
    private stockItemRepo: IStockItemRepository,
    private movementRepo: IStockMovementRepository,
    private reverseReservations: ReverseStockReservations
  ) {}

  async execute(orderId: string): Promise<void> {
    // Busca peças com used=true e stockItemId não nulo
    const usedParts = await prisma.orderPart.findMany({
      where: {
        orderId,
        used: true,
        stockItemId: { not: null },
      },
    });

    // Para cada peça usada, registra movimento de CONSUMPTION
    for (const part of usedParts) {
      if (!part.stockItemId) continue;

      const item = await this.stockItemRepo.findById(part.stockItemId);
      if (!item) continue;

      const balanceBefore = item.quantity;
      const balanceAfter = balanceBefore; // já foi decrementado na reserva

      await this.movementRepo.create({
        type: "CONSUMPTION",
        quantity: part.quantity,
        reason: `Consumo confirmado — OS ${orderId}`,
        orderId,
        balanceBefore,
        balanceAfter,
        stockItemId: part.stockItemId,
        document: null,
      });
    }

    // Estorna reservas de peças não utilizadas (used=false)
    await this.reverseReservations.execute(orderId);
  }
}
