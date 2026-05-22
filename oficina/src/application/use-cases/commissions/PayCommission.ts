import { ICommissionRepository } from "@/domain/repositories/ICommissionRepository";
import { NotFoundError, ValidationError, ForbiddenError } from "@/domain/errors/DomainError";

export class PayCommission {
  constructor(private commissionRepo: ICommissionRepository) {}

  async execute(id: string, tenantId: string, paidById: string, userRole: string): Promise<any> {
    if (userRole !== "ADMIN") {
      throw new ForbiddenError("Apenas administradores podem marcar comissões como pagas");
    }

    const commission = await this.commissionRepo.findById(id, tenantId);
    if (!commission) {
      throw new NotFoundError("Comissão", id);
    }

    if (commission.status !== "APPROVED") {
      throw new ValidationError("Apenas comissões aprovadas podem ser marcadas como pagas");
    }

    return this.commissionRepo.updateStatus(id, {
      status: "PAID",
      paidAt: new Date(),
      paidById,
    });
  }
}
