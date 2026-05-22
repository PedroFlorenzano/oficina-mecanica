import { IWhatsAppRepository } from "@/domain/repositories/IWhatsAppRepository";
import { IServiceOrderRepository } from "@/domain/repositories/IServiceOrderRepository";
import { ValidationError, NotFoundError } from "@/domain/errors/DomainError";

export class SendApprovalLink {
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

    // Criar token de assinatura
    const signature = await this.whatsAppRepo.createSignatureToken(orderId, "APPROVAL", order.client.name);
    const signUrl = `${baseUrl}/sign/${signature.token}`;

    const content = `Olá ${order.client.name}! Seu orçamento da OS #${order.number} está pronto.\n\nValor total: R$ ${order.totalAmount.toFixed(2)}\n\nPara aprovar, acesse o link abaixo e assine digitalmente:\n${signUrl}\n\nLink válido por 48h.`;

    // Registrar mensagem (envio real será feito pelo adapter externo)
    const message = await this.whatsAppRepo.createMessage({
      tenantId,
      orderId,
      type: "APPROVAL_LINK",
      to: order.client.phone,
      content,
    });

    // TODO: Integrar com WhatsApp Business API para envio real
    // await whatsAppAdapter.send(config, message);

    return { message, signUrl, token: signature.token };
  }
}
