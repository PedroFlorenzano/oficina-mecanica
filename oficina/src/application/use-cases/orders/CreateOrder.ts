import { IServiceOrderRepository, OrderData } from "@/domain/repositories/IServiceOrderRepository";
import { IVehicleRepository } from "@/domain/repositories/IVehicleRepository";
import { CreateOrderDTO } from "@/application/dtos/CreateOrderDTO";
import { ValidationError } from "@/domain/errors/DomainError";
import { ReserveOrderParts } from "@/application/use-cases/stock/ReserveOrderParts";

export class CreateOrder {
  constructor(
    private orderRepo: IServiceOrderRepository,
    private vehicleRepo: IVehicleRepository,
    private reserveOrderParts?: ReserveOrderParts
  ) {}

  async execute(input: CreateOrderDTO, tenantId: string, userId: string): Promise<(OrderData & { stockWarnings?: string[] }) | null> {
    if (!input.clientId || !input.vehicleId) {
      throw new ValidationError("Dados obrigatórios ausentes");
    }

    const hasComplaints = input.complaints && Array.isArray(input.complaints) && input.complaints.length > 0;
    const hasServices = input.services && Array.isArray(input.services) && input.services.length > 0;

    if (!hasComplaints && !hasServices) {
      throw new ValidationError("Adicione ao menos uma reclamação ou serviço");
    }

    let result: OrderData | null;

    if (hasComplaints) {
      let totalAmount = 0;
      for (const c of input.complaints!) {
        const svcTotal = (c.services || []).reduce((sum, s) => sum + (s.approved === false ? 0 : (s.price || 0)), 0);
        const prtTotal = (c.parts || []).reduce((sum, p) => sum + (p.approved === false ? 0 : (p.quantity || 0) * (p.unitPrice || 0)), 0);
        totalAmount += svcTotal + prtTotal;
      }

      result = await this.orderRepo.createWithComplaints({
        mileage: input.mileage || 0,
        notes: input.notes || null,
        totalAmount,
        clientId: input.clientId,
        vehicleId: input.vehicleId,
        tenantId,
        createdById: userId,
        attendantId: input.attendantId ?? null,
        mileageOut: input.mileageOut ?? null,
        complaints: input.complaints!.map((c) => ({
          description: c.description,
          services: (c.services || []).map((s) => ({
            description: s.description,
            price: s.price,
            timeMinutes: s.timeMinutes || null,
            serviceId: s.serviceId || null,
            mechanicId: s.mechanicId || null,
            approved: s.approved ?? true,
          })),
          parts: (c.parts || []).map((p) => ({
            description: p.description,
            quantity: p.quantity,
            unitPrice: p.unitPrice,
            costPrice: p.costPrice != null ? Number(p.costPrice) : null,
            stockItemId: p.stockItemId || null,
            approved: p.approved ?? true,
          })),
        })),
      });
    } else {
      result = await this.orderRepo.createLegacy({
        mileage: input.mileage || 0,
        notes: input.notes || null,
        clientId: input.clientId,
        vehicleId: input.vehicleId,
        tenantId,
        createdById: userId,
        services: input.services!.map((s) => ({
          description: s.description,
          price: s.price,
          serviceId: s.serviceId || null,
          mechanicId: s.mechanicId || null,
        })),
        parts: input.parts?.map((p) => ({
          description: p.description,
          quantity: p.quantity,
          unitPrice: p.unitPrice,
          stockItemId: p.stockItemId || null,
        })),
      });
    }

    // Update vehicle mileage
    if (input.mileage && input.mileage > 0) {
      await this.vehicleRepo.updateMileage(input.vehicleId, input.mileage);
    }

    // Reserva do estoque a partir das peças já persistidas (inclui as vinculadas por descrição)
    if (result && this.reserveOrderParts) {
      const stockWarnings = await this.reserveOrderParts.execute(result.id, tenantId);
      if (stockWarnings.length > 0) return { ...result, stockWarnings };
    }

    return result;
  }
}
