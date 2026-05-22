import { IFiscalRepository } from "@/domain/repositories/IFiscalRepository";
import { ValidationError, NotFoundError } from "@/domain/errors/DomainError";

const MAX_RETRIES = 3;

export class RetryInvoice {
  constructor(private fiscalRepo: IFiscalRepository) {}

  async execute(invoiceId: string, tenantId: string): Promise<any> {
    const invoice = await this.fiscalRepo.findInvoiceById(invoiceId, tenantId);
    if (!invoice) {
      throw new NotFoundError("Nota Fiscal", invoiceId);
    }

    if (!["ERROR", "REJECTED"].includes(invoice.status)) {
      throw new ValidationError("Apenas notas com erro ou rejeitadas podem ser reenviadas");
    }

    if (invoice.retryCount >= MAX_RETRIES) {
      throw new ValidationError(`Limite de ${MAX_RETRIES} tentativas atingido. Contate o suporte.`);
    }

    // Resetar para PENDING e incrementar retry
    const updated = await this.fiscalRepo.updateInvoiceStatus(invoiceId, {
      status: "PENDING",
      retryCount: invoice.retryCount + 1,
      lastError: undefined,
    });

    // TODO: Re-enfileirar job no BullMQ para reprocessamento

    return updated;
  }
}
