import { IServiceOrderRepository, OrderData } from "@/domain/repositories/IServiceOrderRepository";
import { NotFoundError, BusinessRuleError, ValidationError } from "@/domain/errors/DomainError";

export interface ToggleItemApprovalInput {
  orderId: string;
  itemType: "service" | "part";
  itemId: string;
  approved: boolean;
}

export class ToggleItemApproval {
  constructor(private orderRepo: IServiceOrderRepository) {}

  async execute(input: ToggleItemApprovalInput, tenantId: string): Promise<OrderData> {
    const { orderId, itemType, itemId, approved } = input;

    if (itemType !== "service" && itemType !== "part") {
      throw new ValidationError("Tipo de item inválido");
    }

    const order = await this.orderRepo.findById(orderId);
    if (!order || order.tenantId !== tenantId) {
      throw new NotFoundError("Ordem de Serviço", orderId);
    }

    if (order.status !== "WAITING_APPROVAL") {
      throw new BusinessRuleError(
        "A aprovação dos itens só pode ser alterada enquanto a OS está aguardando aprovação"
      );
    }

    return this.orderRepo.setItemApproval(orderId, itemType, itemId, approved);
  }
}
