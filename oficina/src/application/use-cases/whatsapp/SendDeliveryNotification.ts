import { IWhatsAppRepository } from "@/domain/repositories/IWhatsAppRepository";
import { IServiceOrderRepository } from "@/domain/repositories/IServiceOrderRepository";
import { ValidationError, NotFoundError } from "@/domain/errors/DomainError";

export class SendDeliveryNotification {
  constructor(
    private whatsAppRepo: IWhatsAppRepository,
    private orderRepo: IServiceOrderRepository
  ) {}

  async execute(orderId: string, tenantId: string, baseUrl: string): Promise<any> {
    const order = await this.orderRepo.findById(orderId);
    if (!order || order.tenantId !== tenantId) {
      throw new NotFoundError("Ordem de Serviço", orderId);
    }

    if (!order.client.phone) {
      throw new ValidationError("Cliente não possui telefone cadastrado");
    }

    const config = await this.whatsAppRepo.getConfig(tenantId);
    if (!config?.enabled) {
      throw new ValidationError("WhatsApp não está configurado para este tenant");
    }

    // Criar token de assinatura de entrega
    const signature = await this.whatsAppRepo.createSignatureToken(orderId, "DELIVERY", order.client.name);
    const signUrl = `${baseUrl}/sign/${signature.token}`;

    const content = `Olá ${order.client.name}! Seu veículo ${order.vehicle.brand} ${order.vehicle.model} (${order.vehicle.plate}) está pronto para retirada.\n\nOS #${order.number}\n\nPara confirmar o recebimento, acesse:\n${signUrl}\n\nLink válido por 48h.`;

    const message = await this.whatsAppRepo.createMessage({
      tenantId,
      orderId,
      type: "DELIVERY_NOTIFICATION",
      to: order.client.phone,
      content,
    });

    return { message, signUrl, token: signature.token };
  }
}
