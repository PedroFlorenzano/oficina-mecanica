import { IServiceOrderRepository } from "@/domain/repositories/IServiceOrderRepository";
import { IVehicleRepository } from "@/domain/repositories/IVehicleRepository";
import { CreateOrderDTO } from "@/application/dtos/CreateOrderDTO";
import { ValidationError } from "@/domain/errors/DomainError";

export class CreateOrder {
  constructor(
    private orderRepo: IServiceOrderRepository,
    private vehicleRepo: IVehicleRepository
  ) {}

  async execute(input: CreateOrderDTO, tenantId: string, userId: string): Promise<any> {
    if (!input.clientId || !input.vehicleId) {
      throw new ValidationError("Dados obrigatórios ausentes");
    }

    const hasComplaints = input.complaints && Array.isArray(input.complaints) && input.complaints.length > 0;
    const hasServices = input.services && Array.isArray(input.services) && input.services.length > 0;

    if (!hasComplaints && !hasServices) {
      throw new ValidationError("Adicione ao menos uma reclamação ou serviço");
    }

    let result: any;

    if (hasComplaints) {
      let totalAmount = 0;
      for (const c of input.complaints!) {
        const svcTotal = (c.services || []).reduce((sum, s) => sum + (s.price || 0), 0);
        const prtTotal = (c.parts || []).reduce((sum, p) => sum + (p.quantity || 0) * (p.unitPrice || 0), 0);
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
        complaints: input.complaints!.map((c) => ({
          description: c.description,
          services: (c.services || []).map((s) => ({
            description: s.description,
            price: s.price,
            serviceId: s.serviceId || null,
            mechanicId: s.mechanicId || null,
          })),
          parts: (c.parts || []).map((p) => ({
            description: p.description,
            quantity: p.quantity,
            unitPrice: p.unitPrice,
            stockItemId: p.stockItemId || null,
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

    return result;
  }
}
