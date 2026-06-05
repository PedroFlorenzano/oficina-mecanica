import { IAppointmentRepository } from "@/domain/repositories/IAppointmentRepository";
import { ValidationError, BusinessRuleError } from "@/domain/errors/DomainError";

interface CreateAppointmentInput {
  clientName: string;
  clientPhone: string;
  vehicleInfo: string;
  description: string;
  date: string; // ISO string
}

export class CreateAppointment {
  constructor(private readonly repo: IAppointmentRepository) {}

  async execute(input: CreateAppointmentInput, tenantId: string) {
    if (!input.clientName?.trim()) throw new ValidationError("Nome é obrigatório.");
    if (!input.clientPhone?.trim()) throw new ValidationError("Telefone é obrigatório.");
    if (!input.vehicleInfo?.trim()) throw new ValidationError("Veículo é obrigatório.");
    if (!input.description?.trim()) throw new ValidationError("Descrição do serviço é obrigatória.");

    const date = new Date(input.date);
    if (isNaN(date.getTime()) || date < new Date()) {
      throw new ValidationError("Data/hora inválida ou no passado.");
    }

    // Check config
    const config = await this.repo.getConfig(tenantId);
    if (!config?.enabled) {
      throw new BusinessRuleError("Agendamento online não está habilitado para esta oficina.");
    }

    // Check slot availability
    const count = await this.repo.countBySlot(tenantId, date);
    if (count >= config.maxPerSlot) {
      throw new BusinessRuleError("Este horário já está lotado. Escolha outro horário.");
    }

    return this.repo.createAppointment({
      tenantId,
      clientName: input.clientName.trim(),
      clientPhone: input.clientPhone.trim(),
      vehicleInfo: input.vehicleInfo.trim(),
      description: input.description.trim(),
      date,
      status: "PENDING",
      cancelReason: null,
      notes: null,
    });
  }
}
