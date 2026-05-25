import { ICommissionRepository, CommissionData } from "@/domain/repositories/ICommissionRepository";
import { NotFoundError, ForbiddenError } from "@/domain/errors/DomainError";

export class GetCommissionDetail {
  constructor(private commissionRepo: ICommissionRepository) {}

  async execute(id: string, tenantId: string, userId: string, userRole: string): Promise<CommissionData> {
    if (userRole === "ATTENDANT") {
      throw new ForbiddenError("Sem permissão para acessar comissões");
    }

    const commission = await this.commissionRepo.findByIdWithItems(id, tenantId);
    if (!commission) {
      throw new NotFoundError("Comissão", id);
    }

    if (userRole === "MECHANIC" && commission.mechanicId !== userId) {
      throw new ForbiddenError("Sem permissão para acessar esta comissão");
    }

    return commission;
  }
}
