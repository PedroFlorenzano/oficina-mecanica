import { ICommissionRepository, CommissionFilters } from "@/domain/repositories/ICommissionRepository";
import { ForbiddenError } from "@/domain/errors/DomainError";

export class ListCommissions {
  constructor(private commissionRepo: ICommissionRepository) {}

  async execute(tenantId: string, userId: string, userRole: string, filters: CommissionFilters): Promise<any[]> {
    if (userRole === "ATTENDANT") {
      throw new ForbiddenError("Sem permissão para acessar comissões");
    }

    if (userRole === "MECHANIC") {
      return this.commissionRepo.findByMechanic(userId, tenantId, filters);
    }

    return this.commissionRepo.findAll(tenantId, filters);
  }
}
