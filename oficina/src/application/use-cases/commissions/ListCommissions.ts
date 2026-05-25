import { ICommissionRepository, CommissionFilters, CommissionData } from "@/domain/repositories/ICommissionRepository";
import { ForbiddenError } from "@/domain/errors/DomainError";

export class ListCommissions {
  constructor(private commissionRepo: ICommissionRepository) {}

  async execute(tenantId: string, userId: string, userRole: string, filters: CommissionFilters): Promise<CommissionData[]> {
    if (userRole === "ATTENDANT") {
      throw new ForbiddenError("Sem permissão para acessar comissões");
    }

    if (userRole === "MECHANIC") {
      return this.commissionRepo.findByMechanic(userId, tenantId, filters);
    }

    return this.commissionRepo.findAll(tenantId, filters);
  }
}
