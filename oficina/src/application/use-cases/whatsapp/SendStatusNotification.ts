import { IServiceOrderRepository } from "@/domain/repositories/IServiceOrderRepository";
import { IWhatsAppRepository } from "@/domain/repositories/IWhatsAppRepository";
import { sendText } from "@/infrastructure/whatsapp/EvolutionApiAdapter";
import { prisma } from "@/infrastructure/database/prisma";
import { renderTemplate } from "./renderTemplate";

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Aguardando Início",
  IN_PROGRESS: "Em Andamento",
  WAITING_PART: "Aguardando Peça",
  WAITING_APPROVAL: "Aguardando Aprovação",
  COMPLETED: "Concluída",
  DELIVERED: "Entregue",
  CANCELLED: "Cancelada",
};

/**
 * Texto padrão usado quando o tenant não personalizou o template `msgStatusUpdate`.
 * Mantém a mensagem que era hardcoded antes de os templates serem lidos.
 */
export const DEFAULT_STATUS_TEMPLATE =
  `🔧 *{oficina}*\n\n` +
  `Olá, {cliente}!\n` +
  `Sua OS *#{os}* ({veiculo} - {placa}) teve o status atualizado para:\n\n` +
  `📋 *{status}*\n\n` +
  `Qualquer dúvida, entre em contato conosco!`;

export class SendStatusNotification {
  /**
   * @param orderRepo repositório de OS (obrigatório)
   * @param whatsAppRepo opcional — quando informado, o template configurado do tenant é usado.
   *        Sem ele, cai no template padrão. Mantém compatibilidade com chamadas antigas.
   */
  constructor(
    private orderRepo: IServiceOrderRepository,
    private whatsAppRepo?: IWhatsAppRepository
  ) {}

  async execute(orderId: string, newStatus: string): Promise<void> {
    const order = await this.orderRepo.findById(orderId);
    if (!order?.client?.phone) return;

    const tenant = await prisma.tenant.findUnique({
      where: { id: order.tenantId },
      select: { name: true },
    });
    const shopName = tenant?.name || "Oficina";

    const config = this.whatsAppRepo ? await this.whatsAppRepo.getConfig(order.tenantId) : null;
    const template =
      config?.msgStatusUpdate && config.msgStatusUpdate.trim()
        ? config.msgStatusUpdate
        : DEFAULT_STATUS_TEMPLATE;

    const statusLabel = STATUS_LABELS[newStatus] || newStatus;
    const text = renderTemplate(template, {
      cliente: order.client.name,
      veiculo: order.vehicle?.model || "",
      placa: order.vehicle?.plate || "",
      os: String(order.number),
      oficina: shopName,
      status: statusLabel,
    });

    await sendText(order.client.phone, text);
  }
}
