import { IServiceOrderRepository } from "@/domain/repositories/IServiceOrderRepository";
import { sendText } from "@/infrastructure/whatsapp/EvolutionApiAdapter";
import { prisma } from "@/infrastructure/database/prisma";

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

    const tenant = await prisma.tenant.findUnique({
      where: { id: order.tenantId },
      select: { name: true },
    });
    const shopName = tenant?.name || "Oficina";

    const statusLabel = STATUS_LABELS[newStatus] || newStatus;
    const text =
      `🔧 *${shopName}*\n\n` +
      `Olá, ${order.client.name}!\n` +
      `Sua OS *#${order.number}* (${order.vehicle?.model || ""} - ${order.vehicle?.plate || ""}) ` +
      `teve o status atualizado para:\n\n` +
      `📋 *${statusLabel}*\n\n` +
      `Qualquer dúvida, entre em contato conosco!`;

    await sendText(order.client.phone, text);
  }
}
