import { IVehicleRepository } from "@/domain/repositories/IVehicleRepository";
import { IClientRepository } from "@/domain/repositories/IClientRepository";
import { FileParser } from "@/application/use-cases/import/parsers/FileParser";
import { VehicleMapper, ImportVehicleDTO, ImportError, ImportSkipped } from "@/application/use-cases/import/parsers/DataMappers";

export interface ImportVehiclesInput {
  buffer: Buffer;
  filename: string;
  tenantId: string;
  skipDuplicates?: boolean;
}

export interface ImportVehiclesOutput {
  imported: number;
  updated: number;
  skipped: number;
  errors: ImportError[];
  skippedRows: ImportSkipped[];
  warnings: string[];
}

export class ImportVehicles {
  constructor(
    private vehicleRepo: IVehicleRepository,
    private clientRepo: IClientRepository
  ) {}

  async execute(input: ImportVehiclesInput): Promise<ImportVehiclesOutput> {
    const { buffer, filename, tenantId, skipDuplicates = true } = input;

    // 1. Parse file
    const parsed = FileParser.parse(buffer, filename);
    if (parsed.rows.length === 0) {
      return {
        imported: 0,
        updated: 0,
        skipped: 0,
        errors: [{ row: 0, message: "Arquivo vazio ou sem dados válidos" }],
        skippedRows: [],
        warnings: [],
      };
    }

    // 2. Map rows to DTOs
    const mapped = VehicleMapper.map(parsed.rows);

    // 3. Build client name → id cache
    const clientCache = new Map<string, string>();
    const allClients = await this.clientRepo.findAll(tenantId);
    for (const client of allClients) {
      clientCache.set(client.name.toUpperCase().trim(), client.id);
    }

    // 4. Import each valid vehicle
    let imported = 0;
    let updated = 0;
    const errors = [...mapped.errors];
    const warnings = [...mapped.warnings];

    for (const dto of mapped.success) {
      try {
        // Find client by name (case-insensitive)
        const clientId = clientCache.get(dto.clientName.toUpperCase().trim());
        if (!clientId) {
          // Try partial match
          const partialMatch = this.findPartialMatch(
            dto.clientName,
            clientCache
          );
          if (!partialMatch) {
            errors.push({
              row: 0,
              field: "cliente",
              value: dto.clientName,
              message: `Cliente "${dto.clientName}" não encontrado. Importe os clientes primeiro.`,
            });
            continue;
          }
          warnings.push(
            `Veículo ${dto.plate}: cliente "${dto.clientName}" vinculado a "${partialMatch.name}" (match parcial)`
          );
          dto.clientName = partialMatch.name;
        }

        const resolvedClientId =
          clientId || this.findPartialMatch(dto.clientName, clientCache)?.id;
        if (!resolvedClientId) continue;

        const existing = await this.vehicleRepo.findByPlate(
          dto.plate,
          tenantId
        );

        if (existing) {
          if (skipDuplicates) {
            mapped.skipped.push({
              row: 0,
              reason: `Veículo "${dto.plate}" já existe`,
            });
          } else {
            await this.vehicleRepo.update(existing.id, {
              brand: dto.brand,
              model: dto.model,
              year: dto.year,
              yearModel: dto.yearModel,
              chassis: dto.chassis,
            });
            updated++;
          }
        } else {
          await this.vehicleRepo.create({
            plate: dto.plate,
            brand: dto.brand,
            model: dto.model,
            year: dto.year,
            yearModel: dto.yearModel,
            color: null,
            fuel: null,
            chassis: dto.chassis,
            clientId: resolvedClientId,
            tenantId,
            mileage: 0,
          });
          imported++;
        }
      } catch (err) {
        errors.push({
          row: 0,
          field: "placa",
          value: dto.plate,
          message: `Erro ao importar veículo ${dto.plate}: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    }

    return {
      imported,
      updated,
      skipped: mapped.skipped.length,
      errors,
      skippedRows: mapped.skipped,
      warnings,
    };
  }

  async preview(
    buffer: Buffer,
    filename: string
  ): Promise<{ data: ImportVehicleDTO[]; errors: ImportError[]; skipped: ImportSkipped[] }> {
    const parsed = FileParser.parse(buffer, filename);
    const mapped = VehicleMapper.map(parsed.rows);
    return {
      data: mapped.success,
      errors: mapped.errors,
      skipped: mapped.skipped,
    };
  }

  private findPartialMatch(
    name: string,
    cache: Map<string, string>
  ): { id: string; name: string } | null {
    const upper = name.toUpperCase().trim();
    for (const [key, id] of cache.entries()) {
      // Match if one contains the other (for shortened names like "HEATING PARTS" vs "HEATING PARTS COMERCIO...")
      if (key.includes(upper) || upper.includes(key)) {
        return { id, name: key };
      }
    }
    return null;
  }
}
