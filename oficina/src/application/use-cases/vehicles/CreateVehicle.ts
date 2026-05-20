import { IVehicleRepository, VehicleData } from "@/domain/repositories/IVehicleRepository";
import { CreateVehicleDTO } from "@/application/dtos/CreateVehicleDTO";
import { Plate } from "@/domain/value-objects/Plate";
import { ConflictError, ValidationError } from "@/domain/errors/DomainError";

export class CreateVehicle {
  constructor(private vehicleRepo: IVehicleRepository) {}

  async execute(input: CreateVehicleDTO, tenantId: string): Promise<VehicleData> {
    if (!input.brand || !input.model || !input.year || !input.clientId) {
      throw new ValidationError("Placa, marca, modelo, ano e cliente são obrigatórios");
    }

    const plate = Plate.create(input.plate);

    const existing = await this.vehicleRepo.findByPlate(plate.toString(), tenantId);
    if (existing) {
      throw new ConflictError("Já existe um veículo com esta placa");
    }

    return this.vehicleRepo.create({
      plate: plate.toString(),
      brand: input.brand,
      model: input.model,
      year: Number(input.year),
      yearModel: input.yearModel ? Number(input.yearModel) : null,
      color: input.color || null,
      fuel: input.fuel || null,
      chassis: input.chassis || null,
      mileage: input.mileage ? Number(input.mileage) : 0,
      clientId: input.clientId,
      tenantId,
    });
  }
}
