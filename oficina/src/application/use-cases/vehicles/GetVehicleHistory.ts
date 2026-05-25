import { IVehicleRepository } from "@/domain/repositories/IVehicleRepository";
import { IServiceOrderRepository, OrderSummary } from "@/domain/repositories/IServiceOrderRepository";
import { NotFoundError } from "@/domain/errors/DomainError";

export class GetVehicleHistory {
  constructor(
    private vehicleRepo: IVehicleRepository,
    private orderRepo: IServiceOrderRepository
  ) {}

  async execute(vehicleId: string, tenantId: string): Promise<OrderSummary[]> {
    const vehicle = await this.vehicleRepo.findById(vehicleId);
    if (!vehicle || vehicle.tenantId !== tenantId) {
      throw new NotFoundError("Veículo não encontrado");
    }
    return this.orderRepo.findByVehicleId(vehicleId, tenantId);
  }
}
