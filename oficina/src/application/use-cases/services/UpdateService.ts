import { IServiceCatalogRepository, ServiceCatalogData } from "@/domain/repositories/IServiceCatalogRepository";
import { CreateServiceDTO } from "@/application/dtos/CreateServiceDTO";
import { ValidationError } from "@/domain/errors/DomainError";

export class UpdateService {
  constructor(private serviceRepo: IServiceCatalogRepository) {}

  async execute(id: string, input: CreateServiceDTO): Promise<ServiceCatalogData> {
    if (!input.description) {
      throw new ValidationError("Descrição é obrigatória");
    }

    return this.serviceRepo.update(id, {
      code: input.code || null,
      description: input.description,
      category: input.category || null,
      estimatedTime: input.estimatedTime ? Number(input.estimatedTime) : null,
      defaultPrice: input.defaultPrice != null ? Number(input.defaultPrice) : 0,
      pricingType: input.pricingType || "VALUE",
      commissionRate: input.commissionRate ? Number(input.commissionRate) : null,
      active: input.active != null ? input.active : true,
    });
  }
}
