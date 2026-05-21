import { IServiceOrderRepository } from "@/domain/repositories/IServiceOrderRepository";
import { NotFoundError, ValidationError, BusinessRuleError } from "@/domain/errors/DomainError";
import { VALID_TRANSITIONS, PISTA_STATUSES } from "@/domain/value-objects/OrderStatusTransitions";

export class UpdatePistaStatus {
  constructor(private orderRepo: IServiceOrderRepository) {}

  async execute(id: string, toStatus: string, userId: string): Promise<any> {
    if (!toStatus) {
      throw new ValidationError("Campo status é obrigatório");
    }
    if (!PISTA_STATUSES.includes(toStatus as any)) {
      throw new ValidationError(`Status inválido: ${toStatus}`);
    }

    const order = await this.orderRepo.findById(id);
    if (!order) {
      throw new NotFoundError("OS", id);
    }

    const fromStatus = order.status as string;
    if (!isValidTransition(fromStatus, toStatus)) {
      throw new BusinessRuleError(
        `Transição de status não permitida: ${fromStatus} → ${toStatus}`
      );
    }

    return this.orderRepo.updateStatus(id, toStatus, userId);
  }
}

export function isValidTransition(from: string, to: string): boolean {
  return VALID_TRANSITIONS[from]?.includes(to as any) ?? false;
}
