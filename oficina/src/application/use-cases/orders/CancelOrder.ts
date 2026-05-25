import { IServiceOrderRepository } from "@/domain/repositories/IServiceOrderRepository";
import { ReverseStockReservations } from "@/application/use-cases/stock/ReverseStockReservations";
import { NotFoundError, BusinessRuleError, ValidationError } from "@/domain/errors/DomainError";

const TERMINAL_STATUSES = ["COMPLETED", "DELIVERED", "CANCELLED"];

export class CancelOrder {
  constructor(
    private orderRepo: IServiceOrderRepository,
    private reverseReservations: ReverseStockReservations
  ) {}

  async execute(orderId: string, reason: string, tenantId: string, userId: string) {
    if (!reason || !reason.trim()) {
      throw new ValidationError("Motivo do cancelamento é obrigatório");
    }

    const order = await this.orderRepo.findById(orderId);
    if (!order || order.tenantId !== tenantId) {
      throw new NotFoundError("Ordem de serviço não encontrada");
    }

    if (TERMINAL_STATUSES.includes(order.status)) {
      throw new BusinessRuleError(
        `Não é possível cancelar uma OS com status ${order.status}`
      );
    }

    // Estorna reservas de estoque antes de persistir o cancelamento
    await this.reverseReservations.execute(orderId);

    return this.orderRepo.cancel(orderId, reason.trim(), userId);
  }
}
