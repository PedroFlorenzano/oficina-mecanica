import { IServiceOrderRepository, OrderData } from "@/domain/repositories/IServiceOrderRepository";
import { NotFoundError, ValidationError } from "@/domain/errors/DomainError";
import { ConfirmStockConsumption } from "@/application/use-cases/stock/ConfirmStockConsumption";

export class UpdateOrderStatus {
  constructor(
    private orderRepo: IServiceOrderRepository,
    private confirmStockConsumption?: ConfirmStockConsumption
  ) {}

  async execute(id: string, status: string, userId: string): Promise<OrderData | null> {
    if (!status) {
      throw new ValidationError("Status é obrigatório");
    }

    const order = await this.orderRepo.findById(id);
    if (!order) {
      throw new NotFoundError("OS", id);
    }

    const updated = await this.orderRepo.updateStatus(id, status, userId);

    // Ao concluir a OS, confirmar consumo de estoque
    if (status === "COMPLETED" && this.confirmStockConsumption) {
      await this.confirmStockConsumption.execute(id);
    }

    // Ao iniciar execução, recalcular prazo com data atual
    if (status === "IN_PROGRESS") {
      try {
        const { CalculateOrderDeadline } = await import("./CalculateOrderDeadline");
        const deadlineUseCase = new CalculateOrderDeadline();
        await deadlineUseCase.execute(id, order.tenantId);
      } catch { /* não bloquear se falhar */ }
    }

    return updated;
  }
}
