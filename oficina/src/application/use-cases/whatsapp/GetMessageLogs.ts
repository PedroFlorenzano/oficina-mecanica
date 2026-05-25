import { IWhatsAppRepository, WhatsAppMessageData } from "@/domain/repositories/IWhatsAppRepository";

export class GetMessageLogs {
  constructor(private whatsAppRepo: IWhatsAppRepository) {}

  async execute(tenantId: string, orderId?: string): Promise<WhatsAppMessageData[]> {
    return this.whatsAppRepo.getMessages(tenantId, orderId);
  }
}
