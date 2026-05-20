import { IVehicleRepository } from "@/domain/repositories/IVehicleRepository";
import { BusinessRuleError } from "@/domain/errors/DomainError";

export class DeleteVehicle {
  constructor(private vehicleRepo: IVehicleRepository) {}

  async execute(id: string): Promise<void> {
    const orderCount = await this.vehicleRepo.countOrders(id);
    if (orderCount > 0) {
      throw new BusinessRuleError(
        `Veículo possui ${orderCount} ordem(ns) de serviço e não pode ser excluído`
      );
    }
    await this.vehicleRepo.delete(id);
  }
}
