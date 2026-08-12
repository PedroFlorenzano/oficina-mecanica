import { IVehicleRepository } from "@/domain/repositories/IVehicleRepository";
import { IClientRepository } from "@/domain/repositories/IClientRepository";
import { FileParser } from "@/application/use-cases/import/parsers/FileParser";
import { VehicleMapper, ImportVehicleDTO, ImportError, ImportSkipped } from "@/application/use-cases/import/parsers/DataMappers";

export interface ImportVehiclesInput {
  buffer: Buffer;
  filename: string;
  tenantId: string;
  skipDuplicates?: boolean;
  chunk?: number;
  chunkSize?: number;
  skipRows?: Set<number>;
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
    const { buffer, filename, tenantId, skipDuplicates = true, chunk, chunkSize = 30, skipRows } = input;

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

    // 4. Import in batches
    let imported = 0;
    let updated = 0;
    const errors = [...mapped.errors];
    const warnings = [...mapped.warnings];

    let itemsToProcess = mapped.success;
    if (skipRows && skipRows.size > 0) {
      itemsToProcess = itemsToProcess.filter((_, i) => !skipRows.has(i));
    }
    if (chunk !== undefined) {
      const start = chunk * chunkSize;
      itemsToProcess = mapped.success.slice(start, start + chunkSize);
    }

    const BATCH_SIZE = 50;
    for (let i = 0; i < itemsToProcess.length; i += BATCH_SIZE) {
      const batch = itemsToProcess.slice(i, i + BATCH_SIZE);

      const results = await Promise.allSettled(
        batch.map(async (dto) => {
          // Find client by name (case-insensitive)
          let resolvedClientId = clientCache.get(dto.clientName.toUpperCase().trim());
          if (!resolvedClientId) {
            const partialMatch = this.findPartialMatch(dto.clientName, clientCache);
            if (!partialMatch) {
              return { action: "error" as const, dto, reason: `Cliente "${dto.clientName}" não encontrado. Importe os clientes primeiro.` };
            }
            resolvedClientId = partialMatch.id;
          }

          const existing = await this.vehicleRepo.findByPlate(dto.plate, tenantId);

          if (existing) {
            if (skipDuplicates) {
              return { action: "skipped" as const, dto };
            } else {
              await this.vehicleRepo.update(existing.id, {
                brand: dto.brand,
                model: dto.model,
                year: dto.year,
                yearModel: dto.yearModel,
                chassis: dto.chassis,
              });
              return { action: "updated" as const, dto };
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
            return { action: "imported" as const, dto };
          }
        })
      );

      for (const result of results) {
        if (result.status === "fulfilled") {
          const val = result.value;
          if (val.action === "imported") imported++;
          else if (val.action === "updated") updated++;
          else if (val.action === "skipped") mapped.skipped.push({ row: 0, reason: `Veículo "${val.dto.plate}" já existe` });
          else if (val.action === "error") errors.push({ row: 0, field: "cliente", value: val.dto.clientName, message: val.reason });
        } else {
          errors.push({ row: 0, message: result.reason?.message || "Erro desconhecido" });
        }
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
