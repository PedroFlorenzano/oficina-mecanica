import { IServiceOrderRepository } from "@/domain/repositories/IServiceOrderRepository";
import { IStockItemRepository } from "@/domain/repositories/IStockItemRepository";
import { IStockMovementRepository } from "@/domain/repositories/IStockMovementRepository";
import { ReserveStock } from "@/application/use-cases/stock/ReserveStock";

/**
 * Reserva estoque para as peças de uma OS a partir do que foi **persistido**, não do que
 * veio na requisição.
 *
 * Isso importa porque o repositório vincula a peça ao item de estoque por descrição quando
 * o `stockItemId` não é informado. Reservar pela entrada deixava essas peças ligadas ao
 * estoque sem reserva, e o saldo só era corrigido na conclusão da OS.
 *
 * Falha de reserva (saldo insuficiente, item de outro tenant) não interrompe o fluxo:
 * volta como aviso para a tela.
 */
export class ReserveOrderParts {
  constructor(
    private orderRepo: IServiceOrderRepository,
    private stockItemRepo: IStockItemRepository,
    private movementRepo: IStockMovementRepository
  ) {}

  async execute(orderId: string, tenantId: string): Promise<string[]> {
    const order = await this.orderRepo.findById(orderId);
    if (!order || order.tenantId !== tenantId) return [];

    // findById devolve as peças duas vezes: dentro das reclamações e na lista plana
    // (compatibilidade com OS antigas). Deduplicar pelo id evita reserva em dobro.
    const byId = new Map<string, { id: string; description: string; quantity: number; stockItemId: string | null }>();
    for (const part of [
      ...(order.complaints || []).flatMap((c) => c.parts || []),
      ...(order.parts || []),
    ]) {
      byId.set(part.id, part);
    }

    const warnings: string[] = [];
    const reserveStock = new ReserveStock(this.stockItemRepo, this.movementRepo);

    for (const part of byId.values()) {
      if (!part.stockItemId) continue;
      try {
        await reserveStock.execute(part.stockItemId, part.quantity, orderId, tenantId);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Erro desconhecido";
        warnings.push(`${part.description}: ${msg}`);
      }
    }

    return warnings;
  }
}
