import { IServiceOrderRepository } from "@/domain/repositories/IServiceOrderRepository";
import { NotFoundError, ValidationError } from "@/domain/errors/DomainError";

export class UpdateOrderStatus {
  constructor(private orderRepo: IServiceOrderRepository) {}

  async execute(id: string, status: string, userId: string): Promise<any> {
    if (!status) {
      throw new ValidationError("Status é obrigatório");
    }

    const order = await this.orderRepo.findById(id);
    if (!order) {
      throw new NotFoundError("OS", id);
    }

    return this.orderRepo.updateStatus(id, status, userId);
  }
}
