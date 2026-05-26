import { IFiscalRepository, FiscalInvoiceData } from "@/domain/repositories/IFiscalRepository";
import { IServiceOrderRepository } from "@/domain/repositories/IServiceOrderRepository";
import { ValidationError, NotFoundError, ConflictError } from "@/domain/errors/DomainError";

export class IssueFiscalInvoice {
  constructor(
    private fiscalRepo: IFiscalRepository,
    private orderRepo: IServiceOrderRepository
  ) {}

  async execute(orderId: string, type: "NFE" | "NFSE", tenantId: string): Promise<FiscalInvoiceData> {
    if (!type || !["NFE", "NFSE"].includes(type)) {
      throw new ValidationError("Tipo de nota fiscal inválido (NFE ou NFSE)");
    }

    const order = await this.orderRepo.findById(orderId);
    if (!order || order.tenantId !== tenantId) {
      throw new NotFoundError("Ordem de Serviço", orderId);
    }

    if (!["COMPLETED", "DELIVERED"].includes(order.status)) {
      throw new ValidationError("Nota fiscal só pode ser emitida para OS concluída ou entregue");
    }

    const config = await this.fiscalRepo.getConfig(tenantId);
    if (!config?.enabled) {
      throw new ValidationError("Módulo fiscal não está configurado");
    }

    // Verificar se já existe nota autorizada para esta OS e tipo
    const existing = await this.fiscalRepo.findInvoicesByOrder(orderId, tenantId);
    const hasAuthorized = existing.find((i) => i.type === type && i.status === "AUTHORIZED");
    if (hasAuthorized) {
      throw new ConflictError(`Já existe uma ${type} autorizada para esta OS`);
    }

    // Montar itens da nota — coleta de complaints (se existem) ou avulsos
    const hasComplaints = (order.complaints || []).length > 0;
    const allParts = hasComplaints
      ? (order.complaints || []).flatMap(c => c.parts || [])
      : (order.parts || []);
    const allServices = hasComplaints
      ? (order.complaints || []).flatMap(c => c.services || [])
      : (order.services || []);

    const items = type === "NFE"
      ? allParts
          .filter((p) => p.used !== false)
          .map((p) => {
            const desc = [p.description];
            if (p.stockItem?.brand) desc.push(p.stockItem.brand);
            if (p.stockItem?.supplier) desc.push(`Forn: ${p.stockItem.supplier}`);
            return { description: desc.join(" | "), quantity: p.quantity, unitPrice: p.unitPrice, totalPrice: p.totalPrice, cfop: "5102", ncm: "" };
          })
      : allServices.map((s) => ({ description: s.description, quantity: 1, unitPrice: s.price, totalPrice: s.price, serviceCode: "" }));

    if (items.length === 0) {
      throw new ValidationError(`Nenhum ${type === "NFE" ? "produto" : "serviço"} encontrado na OS para emissão`);
    }

    const totalAmount = items.reduce((s, i) => s + i.totalPrice, 0);

    const invoice = await this.fiscalRepo.createInvoice({ tenantId, orderId, type, totalAmount, items });

    // TODO: Enviar para SEFAZ/Prefeitura via adapter externo
    // Em produção: BullMQ job → adapter → atualiza status para AUTHORIZED ou REJECTED

    return invoice;
  }
}
