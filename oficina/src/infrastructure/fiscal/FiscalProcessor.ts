import { IFiscalRepository } from "@/domain/repositories/IFiscalRepository";
import { IFiscalAdapter, FiscalAdapterInput } from "./IFiscalAdapter";

const MAX_RETRIES = 3;

/**
 * Processador síncrono de notas fiscais.
 * Substitui BullMQ — processa imediatamente com retry automático.
 */
export class FiscalProcessor {
  constructor(
    private fiscalRepo: IFiscalRepository,
    private adapter: IFiscalAdapter
  ) {}

  async process(invoiceId: string, tenantId: string): Promise<void> {
    const invoice = await this.fiscalRepo.findInvoiceById(invoiceId, tenantId);
    if (!invoice || invoice.status !== "PENDING") return;

    const config = await this.fiscalRepo.getConfig(tenantId);
    if (!config) return;

    // Marcar como processando
    await this.fiscalRepo.updateInvoiceStatus(invoiceId, { status: "PROCESSING" });

    const number = await this.fiscalRepo.incrementNextNumber(tenantId, invoice.type as "NFE" | "NFSE");
    const series = invoice.type === "NFE" ? config.nfeSeries : parseInt(config.nfseSeries) || 1;

    const input: FiscalAdapterInput = {
      type: invoice.type as "NFE" | "NFSE",
      number,
      series,
      cnpj: config.cnpj || "",
      razaoSocial: config.razaoSocial || "",
      inscricaoEstadual: config.inscricaoEstadual || null,
      inscricaoMunicipal: config.inscricaoMunicipal || null,
      cityCode: config.cityCode || null,
      items: (invoice.items || []).map(i => ({
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        totalPrice: i.totalPrice,
        cfop: i.cfop,
        ncm: i.ncm,
        serviceCode: i.serviceCode,
      })),
      totalAmount: invoice.totalAmount,
      tomadorEndereco: invoice.order?.client?.address || null,
      tomadorEmail: invoice.order?.client?.email || null,
      tomadorTelefone: invoice.order?.client?.phone || null,
    };

    let lastError = "";
    for (let attempt = 0; attempt <= Math.min(invoice.retryCount, MAX_RETRIES - 1); attempt++) {
      try {
        const result = await this.adapter.authorize(input);
        await this.fiscalRepo.updateInvoiceStatus(invoiceId, {
          status: "AUTHORIZED",
          number: result.number,
          series: result.series,
          accessKey: result.accessKey,
          protocolNumber: result.protocolNumber,
          xmlContent: result.xmlContent,
          issueDate: result.issueDate,
        });
        return;
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
      }
    }

    // Todas as tentativas falharam
    await this.fiscalRepo.updateInvoiceStatus(invoiceId, {
      status: "ERROR",
      lastError,
      retryCount: invoice.retryCount + 1,
    });
  }

  async processRetry(invoiceId: string, tenantId: string): Promise<void> {
    await this.process(invoiceId, tenantId);
  }
}
