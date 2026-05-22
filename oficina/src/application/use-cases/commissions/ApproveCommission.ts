import { ICommissionRepository } from "@/domain/repositories/ICommissionRepository";
import { NotFoundError, ValidationError, ForbiddenError } from "@/domain/errors/DomainError";

export class ApproveCommission {
  constructor(private commissionRepo: ICommissionRepository) {}

  async execute(id: string, tenantId: string, approvedById: string, userRole: string): Promise<any> {
    if (userRole !== "ADMIN") {
      throw new ForbiddenError("Apenas administradores podem aprovar comissões");
    }

    const commission = await this.commissionRepo.findById(id, tenantId);
    if (!commission) {
      throw new NotFoundError("Comissão", id);
    }

    if (commission.status !== "PENDING") {
      throw new ValidationError("Apenas comissões pendentes podem ser aprovadas");
    }

    return this.commissionRepo.updateStatus(id, {
      status: "APPROVED",
      approvedAt: new Date(),
      approvedById,
    });
  }
}
