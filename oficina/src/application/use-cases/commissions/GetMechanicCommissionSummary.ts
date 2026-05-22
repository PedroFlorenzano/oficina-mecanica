import { ICommissionRepository } from "@/domain/repositories/ICommissionRepository";
import { ForbiddenError } from "@/domain/errors/DomainError";

export class GetMechanicCommissionSummary {
  constructor(private commissionRepo: ICommissionRepository) {}

  async execute(mechanicId: string, tenantId: string, userId: string, userRole: string): Promise<any> {
    if (userRole === "ATTENDANT") {
      throw new ForbiddenError("Sem permissão para acessar comissões");
    }

    if (userRole === "MECHANIC" && mechanicId !== userId) {
      throw new ForbiddenError("Sem permissão para acessar comissões de outro mecânico");
    }

    return this.commissionRepo.getMechanicSummary(mechanicId, tenantId);
  }
}
