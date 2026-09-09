import { prisma } from "@/infrastructure/database/prisma";
import { IStockItemRepository } from "@/domain/repositories/IStockItemRepository";
import { IStockMovementRepository } from "@/domain/repositories/IStockMovementRepository";
import { ReverseStockReservations } from "@/application/use-cases/stock/ReverseStockReservations";

/**
 * Confirma a baixa de estoque das peças de uma OS ao concluí-la.
 *
 * Regras:
 * - Peça aprovada pelo cliente = peça aplicada no veículo → gera CONSUMPTION e marca `used`.
 *   Se a peça já tinha reserva (RESERVED), o saldo foi decrementado na reserva e o consumo
 *   apenas liquida a reserva. Se não havia reserva (ex.: saldo insuficiente na abertura da OS),
 *   a baixa é feita agora.
 * - Peça não aprovada não é consumida: a reserva é estornada e o saldo volta ao estoque.
 * - O saldo nunca fica negativo: sem saldo, a peça não é baixada e um aviso é retornado.
 */
export class ConfirmStockConsumption {
  constructor(
    private stockItemRepo: IStockItemRepository,
    private movementRepo: IStockMovementRepository,
    private reverseReservations: ReverseStockReservations
  ) {}

  async execute(orderId: string): Promise<string[]> {
    const warnings: string[] = [];

    const parts = await prisma.orderPart.findMany({
      where: { orderId, approved: true, stockItemId: { not: null } },
    });

    const pendingReservations = await this.movementRepo.findPendingReservations(orderId);
    const reservedByItem = new Map(pendingReservations.map((r) => [r.stockItemId, r.quantity]));

    for (const part of parts) {
      if (!part.stockItemId) continue;

      const item = await this.stockItemRepo.findById(part.stockItemId);
      if (!item) continue;

      const reservedQty = reservedByItem.get(part.stockItemId);
      const balanceBefore = item.quantity;

      if (reservedQty != null) {
        // Saldo já foi decrementado na reserva — o consumo apenas a liquida
        await this.movementRepo.create({
          type: "CONSUMPTION",
          quantity: part.quantity,
          reason: `Consumo confirmado — OS ${orderId}`,
          orderId,
          balanceBefore,
          balanceAfter: balanceBefore,
          stockItemId: part.stockItemId,
          document: null,
          supplier: null,
          unitCost: item.avgCost,
        });
        reservedByItem.delete(part.stockItemId);
        await prisma.orderPart.update({ where: { id: part.id }, data: { used: true } });
        continue;
      }

      // Sem reserva: dar baixa agora, sem deixar o saldo negativo
      if (balanceBefore < part.quantity) {
        warnings.push(
          `${part.description}: saldo insuficiente para baixa (disponível ${balanceBefore}, necessário ${part.quantity})`
        );
        continue;
      }

      const balanceAfter = balanceBefore - part.quantity;
      await this.movementRepo.create({
        type: "CONSUMPTION",
        quantity: part.quantity,
        reason: `Consumo confirmado — OS ${orderId}`,
        orderId,
        balanceBefore,
        balanceAfter,
        stockItemId: part.stockItemId,
        document: null,
        supplier: null,
        unitCost: item.avgCost,
      });
      await this.stockItemRepo.update(part.stockItemId, { quantity: balanceAfter });
      await prisma.orderPart.update({ where: { id: part.id }, data: { used: true } });
    }

    // Estorna reservas que sobraram (peças não aprovadas / removidas do orçamento)
    await this.reverseReservations.execute(orderId);

    return warnings;
  }
}
