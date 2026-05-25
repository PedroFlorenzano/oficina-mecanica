import { IVehicleRepository } from "@/domain/repositories/IVehicleRepository";
import { IServiceOrderRepository } from "@/domain/repositories/IServiceOrderRepository";
import { IWhatsAppRepository } from "@/domain/repositories/IWhatsAppRepository";
import { sendText } from "@/infrastructure/whatsapp/EvolutionApiAdapter";

const CHANGE_INTERVAL = 5000; // km
const ALERT_WINDOW = 4000;    // km — alerta a partir daqui
const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000;

export class SendOilChangeReminders {
  constructor(
    private vehicleRepo: IVehicleRepository,
    private orderRepo: IServiceOrderRepository,
    private whatsAppRepo: IWhatsAppRepository,
  ) {}

  async execute(tenantId: string): Promise<{ sent: number; skipped: number }> {
    const config = await this.whatsAppRepo.getConfig(tenantId);
    if (!config?.enabled) return { sent: 0, skipped: 0 };

    const vehicles = await this.vehicleRepo.findWithReminderEnabled(tenantId);
    let sent = 0;
    let skipped = 0;

    for (const vehicle of vehicles) {
      if (!vehicle.client?.phone) { skipped++; continue; }

      const oilOrders = await this.orderRepo.findOilChangeOrders(vehicle.id, tenantId);
      if (oilOrders.length === 0) { skipped++; continue; }

      const lastChange = oilOrders.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];

      const kmOverdue = vehicle.mileage >= lastChange.mileage + ALERT_WINDOW;
      const timeOverdue = Date.now() - new Date(lastChange.createdAt).getTime() > SIX_MONTHS_MS;

      if (!kmOverdue && !timeOverdue) { skipped++; continue; }

      const text =
        `🛢️ *Lembrete de Troca de Óleo*\n\n` +
        `Olá, ${vehicle.client.name}!\n\n` +
        `Seu veículo *${vehicle.brand} ${vehicle.model}* (${vehicle.plate}) está próximo ` +
        `ou já ultrapassou o prazo da troca de óleo.\n\n` +
        `• Última troca: ${lastChange.mileage.toLocaleString("pt-BR")} km\n` +
        `• KM atual: ${vehicle.mileage.toLocaleString("pt-BR")} km\n` +
        `• Próxima troca: ${(lastChange.mileage + CHANGE_INTERVAL).toLocaleString("pt-BR")} km\n\n` +
        `Agende sua revisão! 📞\n${config.businessName || ""}`;

      const message = await this.whatsAppRepo.createMessage({
        tenantId,
        type: "MAINTENANCE_REMINDER",
        to: vehicle.client.phone,
        content: text,
      });

      const result = await sendText(vehicle.client.phone, text);
      await this.whatsAppRepo.updateMessageStatus(
        message.id,
        result.success ? "SENT" : "FAILED",
        result.messageId,
        result.error,
      );

      if (result.success) sent++; else skipped++;
    }

    return { sent, skipped };
  }
}
