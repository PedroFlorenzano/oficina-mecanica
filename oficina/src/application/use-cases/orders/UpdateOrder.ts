import { IServiceOrderRepository } from "@/domain/repositories/IServiceOrderRepository";
import { IStockItemRepository } from "@/domain/repositories/IStockItemRepository";
import { IStockMovementRepository } from "@/domain/repositories/IStockMovementRepository";
import { UpdateOrderDTO } from "@/application/dtos/UpdateOrderDTO";
import { ValidationError, NotFoundError, BusinessRuleError } from "@/domain/errors/DomainError";
import { ReserveStock } from "@/application/use-cases/stock/ReserveStock";
import { ReverseStockReservations } from "@/application/use-cases/stock/ReverseStockReservations";

export class UpdateOrder {
  constructor(
    private orderRepo: IServiceOrderRepository,
    private stockItemRepo: IStockItemRepository,
    private stockMovementRepo: IStockMovementRepository
  ) {}

  async execute(orderId: string, input: UpdateOrderDTO, tenantId: string) {
    const order = await this.orderRepo.findById(orderId);
    if (!order || order.tenantId !== tenantId) {
      throw new NotFoundError("Ordem de Serviço", orderId);
    }

    if (order.status !== "WAITING_APPROVAL") {
      throw new BusinessRuleError(
        "Somente OS em status 'Aguardando Aprovação' pode ser editada"
      );
    }

    if (!input.complaints || input.complaints.length === 0) {
      throw new ValidationError("A OS deve ter ao menos uma reclamação");
    }

    const hasService = input.complaints.some(
      (c) => c.services && c.services.some((s) => s.description && s.price > 0)
    );
    if (!hasService) {
      throw new ValidationError("A OS deve ter ao menos um serviço com preço");
    }

    // Validar quantidades de peças
    for (const c of input.complaints) {
      for (const p of c.parts || []) {
        if (!p.description) throw new ValidationError("Descrição da peça é obrigatória");
        if (!p.quantity || p.quantity <= 0) throw new ValidationError(`Quantidade inválida para peça "${p.description}"`);
        if (p.unitPrice < 0) throw new ValidationError(`Preço unitário inválido para peça "${p.description}"`);
      }
    }

    // Calcular novo totalAmount
    let totalAmount = 0;
    for (const c of input.complaints) {
      const svcTotal = (c.services || []).reduce((sum, s) => sum + (s.price || 0), 0);
      const prtTotal = (c.parts || []).reduce((sum, p) => sum + (p.quantity || 0) * (p.unitPrice || 0), 0);
      totalAmount += svcTotal + prtTotal;
    }

    // Reverter TODAS as reservas de estoque da OS atual
    const reverseReservations = new ReverseStockReservations(this.stockItemRepo, this.stockMovementRepo);
    await reverseReservations.execute(orderId);

    // Substituir complaints/services/parts no banco
    const complaints = input.complaints.map((c) => ({
      description: c.description,
      services: (c.services || []).filter((s) => s.description).map((s) => ({
        description: s.description,
        price: s.price,
        timeMinutes: s.timeMinutes || null,
        serviceId: s.serviceId || null,
        mechanicId: s.mechanicId || null,
      })),
      parts: (c.parts || []).filter((p) => p.description).map((p) => ({
        description: p.description,
        quantity: p.quantity,
        unitPrice: p.unitPrice,
        stockItemId: p.stockItemId || null,
      })),
    }));

    const updated = await this.orderRepo.replaceComplaints(
      orderId, tenantId, complaints, totalAmount, input.notes ?? order.notes
    );

    // Reservar estoque para novas peças com stockItemId
    const stockWarnings: string[] = [];
    for (const c of input.complaints) {
      for (const p of c.parts || []) {
        if (p.stockItemId) {
          try {
            const reserveStock = new ReserveStock(this.stockItemRepo, this.stockMovementRepo);
            await reserveStock.execute(p.stockItemId, p.quantity, orderId, tenantId);
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Erro desconhecido";
            stockWarnings.push(`${p.description}: ${msg}`);
          }
        }
      }
    }

    // Recalcular prazo estimado de entrega (MRP)
    try {
      const { CalculateOrderDeadline } = await import("./CalculateOrderDeadline");
      const deadlineUseCase = new CalculateOrderDeadline();
      await deadlineUseCase.execute(orderId, tenantId);
    } catch { /* não bloquear se falhar */ }

    return { ...updated, stockWarnings: stockWarnings.length > 0 ? stockWarnings : undefined };
  }
}
