import { IFiscalRepository, FiscalInvoiceData } from "@/domain/repositories/IFiscalRepository";
import { ValidationError, NotFoundError } from "@/domain/errors/DomainError";

export class CancelFiscalInvoice {
  constructor(private fiscalRepo: IFiscalRepository) {}

  async execute(invoiceId: string, reason: string, tenantId: string): Promise<FiscalInvoiceData> {
    if (!reason || reason.trim().length < 15) {
      throw new ValidationError("Motivo do cancelamento deve ter no mínimo 15 caracteres");
    }

    const invoice = await this.fiscalRepo.findInvoiceById(invoiceId, tenantId);
    if (!invoice) {
      throw new NotFoundError("Nota Fiscal", invoiceId);
    }

    if (invoice.status !== "AUTHORIZED") {
      throw new ValidationError("Apenas notas autorizadas podem ser canceladas");
    }

    // TODO: Enviar evento de cancelamento para SEFAZ/Prefeitura
    return this.fiscalRepo.cancelInvoice(invoiceId, reason.trim());
  }
}
