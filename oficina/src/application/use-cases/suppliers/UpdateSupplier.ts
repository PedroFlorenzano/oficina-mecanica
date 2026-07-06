import { ISupplierRepository, SupplierData } from "@/domain/repositories/ISupplierRepository";
import { UpdateSupplierDTO } from "@/application/dtos/SupplierDTO";
import { ValidationError, NotFoundError, ConflictError } from "@/domain/errors/DomainError";
import { CNPJ } from "@/domain/value-objects/CNPJ";

export class UpdateSupplier {
  constructor(private readonly supplierRepo: ISupplierRepository) {}

  async execute(id: string, input: UpdateSupplierDTO, tenantId: string): Promise<SupplierData> {
    const existing = await this.supplierRepo.findById(id);
    if (!existing || existing.tenantId !== tenantId) {
      throw new NotFoundError("Fornecedor não encontrado");
    }

    if (input.name !== undefined && input.name.trim().length === 0) {
      throw new ValidationError("Nome do fornecedor é obrigatório");
    }

    // Se CNPJ mudou, validar unicidade
    if (input.cnpj && input.cnpj !== existing.cnpj) {
      const cnpj = CNPJ.create(input.cnpj);
      const duplicate = await this.supplierRepo.findByCnpj(cnpj.toString(), tenantId);
      if (duplicate && duplicate.id !== id) {
        throw new ConflictError("Já existe um fornecedor com este CNPJ");
      }
      input.cnpj = cnpj.toString();
    }

    if (input.defaultLeadTimeDays !== undefined && input.defaultLeadTimeDays < 0) {
      throw new ValidationError("Prazo de entrega não pode ser negativo");
    }

    return this.supplierRepo.update(id, {
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.cnpj !== undefined && { cnpj: input.cnpj || null }),
      ...(input.phone !== undefined && { phone: input.phone || null }),
      ...(input.email !== undefined && { email: input.email || null }),
      ...(input.website !== undefined && { website: input.website || null }),
      ...(input.affiliateUrl !== undefined && { affiliateUrl: input.affiliateUrl || null }),
      ...(input.affiliateCode !== undefined && { affiliateCode: input.affiliateCode || null }),
      ...(input.defaultLeadTimeDays !== undefined && { defaultLeadTimeDays: input.defaultLeadTimeDays }),
      ...(input.active !== undefined && { active: input.active }),
    });
  }
}
