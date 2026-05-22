import { IFiscalRepository } from "@/domain/repositories/IFiscalRepository";

export class GetInvoicesByOrder {
  constructor(private fiscalRepo: IFiscalRepository) {}

  async execute(orderId: string, tenantId: string): Promise<any[]> {
    return this.fiscalRepo.findInvoicesByOrder(orderId, tenantId);
  }
}
