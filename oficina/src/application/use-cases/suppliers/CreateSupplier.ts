import { ISupplierRepository, SupplierData } from "@/domain/repositories/ISupplierRepository";
import { CreateSupplierDTO } from "@/application/dtos/SupplierDTO";
import { ValidationError, ConflictError } from "@/domain/errors/DomainError";
import { CNPJ } from "@/domain/value-objects/CNPJ";

export class CreateSupplier {
  constructor(private readonly supplierRepo: ISupplierRepository) {}

  async execute(input: CreateSupplierDTO, tenantId: string): Promise<SupplierData> {
    if (!input.name || input.name.trim().length === 0) {
      throw new ValidationError("Nome do fornecedor é obrigatório");
    }

    // Validar CNPJ se informado
    if (input.cnpj) {
      const cnpj = CNPJ.create(input.cnpj);
      const existing = await this.supplierRepo.findByCnpj(cnpj.toString(), tenantId);
      if (existing) {
        throw new ConflictError("Já existe um fornecedor com este CNPJ");
      }
    }

    if (input.defaultLeadTimeDays !== undefined && input.defaultLeadTimeDays < 0) {
      throw new ValidationError("Prazo de entrega não pode ser negativo");
    }

    return this.supplierRepo.create({
      name: input.name.trim(),
      cnpj: input.cnpj ? CNPJ.create(input.cnpj).toString() : null,
      phone: input.phone || null,
      email: input.email || null,
      website: input.website || null,
      affiliateUrl: input.affiliateUrl || null,
      affiliateCode: input.affiliateCode || null,
      defaultLeadTimeDays: input.defaultLeadTimeDays ?? 3,
      tenantId,
    });
  }
}
