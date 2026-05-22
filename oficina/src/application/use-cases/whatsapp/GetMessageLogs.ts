import { IWhatsAppRepository } from "@/domain/repositories/IWhatsAppRepository";

export class GetMessageLogs {
  constructor(private whatsAppRepo: IWhatsAppRepository) {}

  async execute(tenantId: string, orderId?: string): Promise<any[]> {
    return this.whatsAppRepo.getMessages(tenantId, orderId);
  }
}
