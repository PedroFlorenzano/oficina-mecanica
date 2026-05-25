import { ICommissionRepository, CommissionData } from "@/domain/repositories/ICommissionRepository";
import { CancelCommissionDTO } from "@/application/dtos/CancelCommissionDTO";
import { NotFoundError, ValidationError, ForbiddenError } from "@/domain/errors/DomainError";

export class CancelCommission {
  constructor(private commissionRepo: ICommissionRepository) {}

  async execute(id: string, input: CancelCommissionDTO, tenantId: string, cancelledById: string, userRole: string): Promise<CommissionData> {
    if (userRole !== "ADMIN") {
      throw new ForbiddenError("Apenas administradores podem cancelar comissões");
    }

    if (!input.cancelReason || input.cancelReason.trim().length < 3) {
      throw new ValidationError("Motivo do cancelamento é obrigatório (mínimo 3 caracteres)");
    }

    const commission = await this.commissionRepo.findById(id, tenantId);
    if (!commission) {
      throw new NotFoundError("Comissão", id);
    }

    if (commission.status === "PAID") {
      throw new ValidationError("Comissões já pagas não podem ser canceladas");
    }

    if (commission.status === "CANCELLED") {
      throw new ValidationError("Comissão já está cancelada");
    }

    return this.commissionRepo.updateStatus(id, {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancelledById,
      cancelReason: input.cancelReason.trim(),
    });
  }
}
