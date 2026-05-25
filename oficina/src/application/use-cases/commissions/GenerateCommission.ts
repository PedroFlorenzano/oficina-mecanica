import { ICommissionRepository, CommissionData } from "@/domain/repositories/ICommissionRepository";
import { IUserRepository } from "@/domain/repositories/IUserRepository";
import { GenerateCommissionDTO } from "@/application/dtos/GenerateCommissionDTO";
import { ValidationError, NotFoundError, ConflictError } from "@/domain/errors/DomainError";

export class GenerateCommission {
  constructor(
    private commissionRepo: ICommissionRepository,
    private userRepo: IUserRepository
  ) {}

  async execute(input: GenerateCommissionDTO, tenantId: string): Promise<CommissionData> {
    const { mechanicId, startDate, endDate } = input;

    if (!mechanicId || !startDate || !endDate) {
      throw new ValidationError("mechanicId, startDate e endDate são obrigatórios");
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    if (start >= end) {
      throw new ValidationError("Data de início deve ser anterior à data de fim");
    }

    const mechanic = await this.userRepo.findById(mechanicId, tenantId);
    if (!mechanic) {
      throw new NotFoundError("Mecânico", mechanicId);
    }
    if (mechanic.role !== "MECHANIC") {
      throw new ValidationError("Usuário informado não é um mecânico");
    }
    if (mechanic.commissionRate <= 0) {
      throw new ValidationError("Mecânico não possui percentual de comissão configurado");
    }

    const overlapping = await this.commissionRepo.findOverlapping(mechanicId, tenantId, start, end);
    if (overlapping) {
      throw new ConflictError("Já existe uma comissão pendente/aprovada para este mecânico no período informado");
    }

    const eligible = await this.commissionRepo.getEligibleServices(mechanicId, tenantId, start, end);
    if (eligible.length === 0) {
      throw new ValidationError("Nenhum serviço elegível encontrado no período informado");
    }

    const rate = mechanic.commissionRate;
    const items = eligible.map((s) => ({
      orderServiceId: s.id,
      baseValue: s.price,
      commissionValue: Math.round(s.price * rate) / 100,
    }));

    const totalBase = items.reduce((sum, i) => sum + i.baseValue, 0);
    const totalCommission = items.reduce((sum, i) => sum + i.commissionValue, 0);

    return this.commissionRepo.create({
      mechanicId,
      tenantId,
      startDate: start,
      endDate: end,
      commissionRate: rate,
      totalBase,
      totalCommission,
      items,
    });
  }
}
