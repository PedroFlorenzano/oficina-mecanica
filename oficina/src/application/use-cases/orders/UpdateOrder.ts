import { IServiceOrderRepository } from "@/domain/repositories/IServiceOrderRepository";
import { IStockItemRepository } from "@/domain/repositories/IStockItemRepository";
import { IStockMovementRepository } from "@/domain/repositories/IStockMovementRepository";
import { IVehicleRepository } from "@/domain/repositories/IVehicleRepository";
import { ITenantSettingsRepository } from "@/domain/repositories/ITenantSettingsRepository";
import { UpdateOrderDTO } from "@/application/dtos/UpdateOrderDTO";
import { ValidationError, NotFoundError, BusinessRuleError } from "@/domain/errors/DomainError";
import { ReserveOrderParts } from "@/application/use-cases/stock/ReserveOrderParts";
import { ReverseStockReservations } from "@/application/use-cases/stock/ReverseStockReservations";

export interface UpdateOrderContext {
  /** Papel do usuário que faz a edição — só ADMIN destrava OS em andamento. */
  userRole?: string;
  /** userId de quem edita — registrado no histórico da OS. */
  userId?: string;
}

// Status que nunca podem ser editados, independentemente da configuração.
const NEVER_EDITABLE = ["DELIVERED", "CANCELLED"];

export class UpdateOrder {
  constructor(
    private orderRepo: IServiceOrderRepository,
    private stockItemRepo: IStockItemRepository,
    private stockMovementRepo: IStockMovementRepository,
    private vehicleRepo?: IVehicleRepository,
    private tenantSettingsRepo?: ITenantSettingsRepository
  ) {}

  async execute(orderId: string, input: UpdateOrderDTO, tenantId: string, ctx: UpdateOrderContext = {}) {
    const order = await this.orderRepo.findById(orderId);
    if (!order || order.tenantId !== tenantId) {
      throw new NotFoundError("Ordem de Serviço", orderId);
    }

    // OS entregue ou cancelada nunca pode ser editada.
    if (NEVER_EDITABLE.includes(order.status)) {
      throw new BusinessRuleError(
        "OS entregue ou cancelada não pode ser editada"
      );
    }

    // Regra base: só WAITING_APPROVAL é editável. Exceção: admin com a
    // configuração allowEditInProgress ligada pode editar OS em andamento.
    if (order.status !== "WAITING_APPROVAL") {
      const isAdmin = ctx.userRole === "ADMIN";
      let allowEditInProgress = false;
      if (isAdmin && this.tenantSettingsRepo) {
        const settings = await this.tenantSettingsRepo.get(tenantId);
        allowEditInProgress = settings?.allowEditInProgress ?? false;
      }
      if (!(isAdmin && allowEditInProgress)) {
        throw new BusinessRuleError(
          "Somente OS em status 'Aguardando Aprovação' pode ser editada"
        );
      }
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

    // KM de saída: quando informado, não pode ser menor que o KM de entrada.
    let mileageOut: number | null | undefined;
    if (input.mileageOut !== undefined) {
      if (input.mileageOut === null || Number.isNaN(Number(input.mileageOut))) {
        mileageOut = null;
      } else {
        const km = Number(input.mileageOut);
        if (km > 0 && km < order.mileage) {
          throw new ValidationError(
            `O KM de saída (${km}) não pode ser menor que o KM de entrada (${order.mileage})`
          );
        }
        mileageOut = km > 0 ? km : null;
      }
    }

    // Calcular novo totalAmount (apenas itens aprovados contam)
    let totalAmount = 0;
    for (const c of input.complaints) {
      const svcTotal = (c.services || []).reduce((sum, s) => sum + (s.approved === false ? 0 : (s.price || 0)), 0);
      const prtTotal = (c.parts || []).reduce((sum, p) => sum + (p.approved === false ? 0 : (p.quantity || 0) * (p.unitPrice || 0)), 0);
      totalAmount += svcTotal + prtTotal;
    }

    // Substituir complaints/services/parts no banco
    const complaints = input.complaints.map((c) => ({
      description: c.description,
      services: (c.services || []).filter((s) => s.description).map((s) => ({
        description: s.description,
        price: s.price,
        timeMinutes: s.timeMinutes || null,
        serviceId: s.serviceId || null,
        mechanicId: s.mechanicId || null,
        approved: s.approved ?? true,
      })),
      parts: (c.parts || []).filter((p) => p.description).map((p) => ({
        description: p.description,
        quantity: p.quantity,
        unitPrice: p.unitPrice,
        costPrice: p.costPrice != null ? Number(p.costPrice) : null,
        stockItemId: p.stockItemId || null,
        approved: p.approved ?? true,
      })),
    }));

    // A gravação vem primeiro: estornar as reservas antes da transação deixava o saldo
    // inflado quando a substituição das reclamações falhava.
    const updated = await this.orderRepo.replaceComplaints(
      orderId,
      tenantId,
      complaints,
      totalAmount,
      input.notes ?? order.notes,
      {
        attendantId: input.attendantId !== undefined ? (input.attendantId || null) : undefined,
        mileageOut,
      }
    );

    // Atualiza a quilometragem do veículo quando o KM de saída é informado.
    if (this.vehicleRepo && mileageOut != null && mileageOut > 0) {
      try {
        await this.vehicleRepo.updateMileage(order.vehicleId, mileageOut);
      } catch { /* não bloquear a edição se a atualização do KM do veículo falhar */ }
    }

    // Registra a edição no histórico da OS (auditoria) sem trocar o status.
    if (ctx.userId) {
      try {
        await this.orderRepo.recordStatusHistory(orderId, order.status, ctx.userId);
      } catch { /* histórico é auditoria; não bloquear a edição */ }
    }

    // Estorna as reservas antigas e reserva de novo a partir do que ficou gravado —
    // inclui as peças que o repositório vinculou ao estoque por descrição.
    const reverseReservations = new ReverseStockReservations(this.stockItemRepo, this.stockMovementRepo);
    await reverseReservations.execute(orderId);

    const reserveOrderParts = new ReserveOrderParts(
      this.orderRepo, this.stockItemRepo, this.stockMovementRepo
    );
    const stockWarnings = await reserveOrderParts.execute(orderId, tenantId);

    // Recalcular prazo estimado de entrega (MRP)
    try {
      const { CalculateOrderDeadline } = await import("./CalculateOrderDeadline");
      const deadlineUseCase = new CalculateOrderDeadline();
      await deadlineUseCase.execute(orderId, tenantId);
    } catch { /* não bloquear se falhar */ }

    return { ...updated, stockWarnings: stockWarnings.length > 0 ? stockWarnings : undefined };
  }
}
