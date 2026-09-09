import { IStockItemRepository, StockItemData } from "@/domain/repositories/IStockItemRepository";
import { IVehicleRepository } from "@/domain/repositories/IVehicleRepository";
import { NotFoundError, ValidationError } from "@/domain/errors/DomainError";
import { Plate } from "@/domain/value-objects/Plate";

export interface SearchPartsByVehicleInput {
  plate?: string | null;
  vehicleId?: string | null;
}

export interface SearchPartsByVehicleResult {
  vehicle: { id: string; plate: string; brand: string; model: string; year: number } | null;
  terms: string[];
  items: StockItemData[];
}

/**
 * Busca peças compatíveis com um veículo a partir da placa (ou id do veículo).
 * A compatibilidade usa o campo "Aplicação" do cadastro do produto, comparando
 * com marca, modelo e primeira palavra do modelo (ex: "GOL 1.6" → "GOL").
 */
export class SearchPartsByVehicle {
  constructor(
    private stockRepo: IStockItemRepository,
    private vehicleRepo: IVehicleRepository
  ) {}

  async execute(
    input: SearchPartsByVehicleInput,
    tenantId: string
  ): Promise<SearchPartsByVehicleResult> {
    if (!input.plate && !input.vehicleId) {
      throw new ValidationError("Informe a placa ou o veículo");
    }

    const vehicle = input.vehicleId
      ? await this.vehicleRepo.findById(input.vehicleId)
      : await this.vehicleRepo.findByPlate(Plate.create(input.plate!).toString(), tenantId);

    if (!vehicle || vehicle.tenantId !== tenantId) {
      throw new NotFoundError("Veículo", input.plate ?? input.vehicleId ?? "");
    }

    const terms = this.buildTerms(vehicle.brand, vehicle.model);
    const items = await this.stockRepo.findByApplication(terms, tenantId);

    return {
      vehicle: {
        id: vehicle.id,
        plate: vehicle.plate,
        brand: vehicle.brand,
        model: vehicle.model,
        year: vehicle.year,
      },
      terms,
      items,
    };
  }

  private buildTerms(brand: string, model: string): string[] {
    const firstModelWord = model.trim().split(/\s+/)[0] ?? "";
    const terms = [model.trim(), firstModelWord, brand.trim()];
    // remove duplicados e termos curtos demais para busca útil
    return [...new Set(terms.map((t) => t.toUpperCase()).filter((t) => t.length >= 2))];
  }
}
