import { IServiceCatalogRepository, ServiceCatalogData } from "@/domain/repositories/IServiceCatalogRepository";
import { CreateServiceDTO } from "@/application/dtos/CreateServiceDTO";
import { ValidationError } from "@/domain/errors/DomainError";

export class CreateService {
  constructor(private serviceRepo: IServiceCatalogRepository) {}

  async execute(input: CreateServiceDTO, tenantId: string): Promise<ServiceCatalogData> {
    if (!input.description) {
      throw new ValidationError("Descrição é obrigatória");
    }

    if (input.defaultPrice == null || Number(input.defaultPrice) < 0) {
      throw new ValidationError("Preço padrão é obrigatório");
    }

    return this.serviceRepo.create({
      code: input.code || null,
      description: input.description,
      category: input.category || null,
      estimatedTime: input.estimatedTime ? Number(input.estimatedTime) : null,
      defaultPrice: Number(input.defaultPrice),
      pricingType: input.pricingType || "VALUE",
      commissionRate: input.commissionRate ? Number(input.commissionRate) : null,
      active: input.active != null ? input.active : true,
      tenantId,
    });
  }
}
