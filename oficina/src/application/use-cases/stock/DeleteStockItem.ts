import { IStockItemRepository } from "@/domain/repositories/IStockItemRepository";
import { BusinessRuleError } from "@/domain/errors/DomainError";

export class DeleteStockItem {
  constructor(private stockRepo: IStockItemRepository) {}

  async execute(id: string): Promise<void> {
    const movementCount = await this.stockRepo.countMovements(id);
    if (movementCount > 0) {
      throw new BusinessRuleError("Item possui movimentações e não pode ser excluído. Desative-o ao invés disso.");
    }

    const orderPartCount = await this.stockRepo.countOrderParts(id);
    if (orderPartCount > 0) {
      throw new BusinessRuleError("Item está vinculado a ordens de serviço e não pode ser excluído");
    }

    await this.stockRepo.delete(id);
  }
}
