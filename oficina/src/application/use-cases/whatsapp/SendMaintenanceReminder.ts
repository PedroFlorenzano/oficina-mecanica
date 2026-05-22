import { IWhatsAppRepository } from "@/domain/repositories/IWhatsAppRepository";
import { ValidationError } from "@/domain/errors/DomainError";

interface ReminderInput {
  clientName: string;
  clientPhone: string;
  vehicleInfo: string;
  vehiclePlate: string;
  lastServiceDate: string;
  lastMileage: number;
}

export class SendMaintenanceReminder {
  constructor(private whatsAppRepo: IWhatsAppRepository) {}

  async execute(input: ReminderInput, tenantId: string): Promise<any> {
    if (!input.clientPhone) {
      throw new ValidationError("Telefone do cliente é obrigatório");
    }

    const config = await this.whatsAppRepo.getConfig(tenantId);
    if (!config?.enabled) {
      throw new ValidationError("WhatsApp não está configurado para este tenant");
    }

    const content = `Olá ${input.clientName}! 🔧\n\nSeu veículo ${input.vehicleInfo} (${input.vehiclePlate}) está próximo da revisão preventiva.\n\nÚltima troca de óleo: ${input.lastServiceDate} com ${input.lastMileage.toLocaleString()} km.\n\nAgende sua revisão conosco!\n\n${config.businessName || ""}`;

    const message = await this.whatsAppRepo.createMessage({
      tenantId,
      type: "MAINTENANCE_REMINDER",
      to: input.clientPhone,
      content,
    });

    return { message };
  }
}
