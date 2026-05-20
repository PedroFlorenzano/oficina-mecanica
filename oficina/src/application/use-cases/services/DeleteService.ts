import { IServiceCatalogRepository } from "@/domain/repositories/IServiceCatalogRepository";
import { BusinessRuleError } from "@/domain/errors/DomainError";

export class DeleteService {
  constructor(private serviceRepo: IServiceCatalogRepository) {}

  async execute(id: string): Promise<void> {
    const count = await this.serviceRepo.countOrderServices(id);
    if (count > 0) {
      throw new BusinessRuleError("Serviço está vinculado a ordens e não pode ser excluído. Desative-o ao invés disso.");
    }
    await this.serviceRepo.delete(id);
  }
}
