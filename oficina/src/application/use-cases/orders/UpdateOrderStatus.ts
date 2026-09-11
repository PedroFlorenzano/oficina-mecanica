import { IServiceOrderRepository, OrderData } from "@/domain/repositories/IServiceOrderRepository";
import { NotFoundError, ValidationError, BusinessRuleError } from "@/domain/errors/DomainError";
import { ORDER_STATUSES, TERMINAL_STATUSES } from "@/domain/value-objects/OrderStatusTransitions";
import { ConfirmStockConsumption } from "@/application/use-cases/stock/ConfirmStockConsumption";

export class UpdateOrderStatus {
  constructor(
    private orderRepo: IServiceOrderRepository,
    private confirmStockConsumption?: ConfirmStockConsumption
  ) {}

  async execute(
    id: string,
    status: string,
    userId: string,
    tenantId: string
  ): Promise<(OrderData & { stockWarnings?: string[] }) | null> {
    if (!status) {
      throw new ValidationError("Status é obrigatório");
    }

    if (!(ORDER_STATUSES as readonly string[]).includes(status)) {
      throw new ValidationError(`Status inválido: ${status}`);
    }

    const order = await this.orderRepo.findById(id);
    // O tenant vem da sessão: OS de outra oficina é tratada como inexistente
    if (!order || order.tenantId !== tenantId) {
      throw new NotFoundError("OS", id);
    }

    if ((TERMINAL_STATUSES as readonly string[]).includes(order.status)) {
      throw new BusinessRuleError(
        "OS entregue ou cancelada não pode mudar de status"
      );
    }

    const updated = await this.orderRepo.updateStatus(id, status, userId);

    // Ao concluir a OS, confirmar consumo de estoque (baixa das peças aprovadas)
    let stockWarnings: string[] = [];
    if (status === "COMPLETED" && this.confirmStockConsumption) {
      stockWarnings = await this.confirmStockConsumption.execute(id);
    }

    // Ao iniciar execução, recalcular prazo com data atual
    if (status === "IN_PROGRESS") {
      try {
        const { CalculateOrderDeadline } = await import("./CalculateOrderDeadline");
        const deadlineUseCase = new CalculateOrderDeadline();
        await deadlineUseCase.execute(id, order.tenantId);
      } catch { /* não bloquear se falhar */ }
    }

    return updated
      ? { ...updated, stockWarnings: stockWarnings.length > 0 ? stockWarnings : undefined }
      : updated;
  }
}
