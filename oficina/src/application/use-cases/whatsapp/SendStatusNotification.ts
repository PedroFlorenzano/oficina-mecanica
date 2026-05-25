import { IServiceOrderRepository } from "@/domain/repositories/IServiceOrderRepository";
import { sendText } from "@/infrastructure/whatsapp/EvolutionApiAdapter";

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Aguardando Início",
  IN_PROGRESS: "Em Andamento",
  WAITING_PART: "Aguardando Peça",
  WAITING_APPROVAL: "Aguardando Aprovação",
  COMPLETED: "Concluída",
  DELIVERED: "Entregue",
  CANCELLED: "Cancelada",
};

export class SendStatusNotification {
  constructor(private orderRepo: IServiceOrderRepository) {}

  async execute(orderId: string, newStatus: string): Promise<void> {
    const order = await this.orderRepo.findById(orderId);
    if (!order?.client?.phone) return;

    const statusLabel = STATUS_LABELS[newStatus] || newStatus;
    const text =
      `🔧 *Paiffer Bosch Car Service*\n\n` +
      `Olá, ${order.client.name}!\n` +
      `Sua OS *#${order.number}* (${order.vehicle?.model || ""} - ${order.vehicle?.plate || ""}) ` +
      `teve o status atualizado para:\n\n` +
      `📋 *${statusLabel}*\n\n` +
      `Qualquer dúvida, entre em contato conosco!`;

    await sendText(order.client.phone, text);
  }
}
