import { ISupplierRepository } from "@/domain/repositories/ISupplierRepository";
import { NotFoundError, BusinessRuleError } from "@/domain/errors/DomainError";

export class DeleteSupplier {
  constructor(private readonly supplierRepo: ISupplierRepository) {}

  async execute(id: string, tenantId: string): Promise<void> {
    const existing = await this.supplierRepo.findById(id);
    if (!existing || existing.tenantId !== tenantId) {
      throw new NotFoundError("Fornecedor não encontrado");
    }

    const hasItems = await this.supplierRepo.hasLinkedStockItems(id);
    if (hasItems) {
      throw new BusinessRuleError(
        "Não é possível excluir um fornecedor vinculado a itens de estoque. Desative-o ou remova os vínculos primeiro."
      );
    }

    await this.supplierRepo.delete(id);
  }
}
