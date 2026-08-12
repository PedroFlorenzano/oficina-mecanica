import { IServiceCatalogRepository } from "@/domain/repositories/IServiceCatalogRepository";
import { FileParser } from "@/application/use-cases/import/parsers/FileParser";
import { ServiceMapper, ImportServiceDTO, ImportError, ImportSkipped } from "@/application/use-cases/import/parsers/DataMappers";

export interface ImportServicesInput {
  buffer: Buffer;
  filename: string;
  tenantId: string;
  skipDuplicates?: boolean;
  chunk?: number;
  chunkSize?: number;
  skipRows?: Set<number>;
}

export interface ImportServicesOutput {
  imported: number;
  updated: number;
  skipped: number;
  errors: ImportError[];
  skippedRows: ImportSkipped[];
  warnings: string[];
}

export class ImportServices {
  constructor(private serviceRepo: IServiceCatalogRepository) {}

  async execute(input: ImportServicesInput): Promise<ImportServicesOutput> {
    const { buffer, filename, tenantId, skipDuplicates = true, skipRows } = input;

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
    const mapped = ServiceMapper.map(parsed.rows);

    // 3. Import each valid service
    let imported = 0;
    let updated = 0;
    const errors = [...mapped.errors];

    const itemsToImport = skipRows && skipRows.size > 0
      ? mapped.success.filter((_, i) => !skipRows.has(i))
      : mapped.success;

    for (const dto of itemsToImport) {
      try {
        const existing = await this.serviceRepo.findByCode(dto.code, tenantId);

        if (existing) {
          if (skipDuplicates) {
            mapped.skipped.push({
              row: 0,
              reason: `Serviço "${dto.code}" já existe (${dto.description})`,
            });
          } else {
            await this.serviceRepo.update(existing.id, {
              description: dto.description,
              defaultPrice: dto.defaultPrice,
            });
            updated++;
          }
        } else {
          await this.serviceRepo.create({
            code: dto.code,
            description: dto.description,
            category: null,
            estimatedTime: null,
            defaultPrice: dto.defaultPrice,
            pricingType: "VALUE",
            commissionRate: null,
            warrantyDays: null,
            active: true,
            tenantId,
          });
          imported++;
        }
      } catch (err) {
        errors.push({
          row: 0,
          field: "código",
          value: dto.code,
          message: `Erro ao importar serviço "${dto.code}": ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    }

    return {
      imported,
      updated,
      skipped: mapped.skipped.length,
      errors,
      skippedRows: mapped.skipped,
      warnings: mapped.warnings,
    };
  }

  async preview(
    buffer: Buffer,
    filename: string
  ): Promise<{ data: ImportServiceDTO[]; errors: ImportError[]; skipped: ImportSkipped[] }> {
    const parsed = FileParser.parse(buffer, filename);
    const mapped = ServiceMapper.map(parsed.rows);
    return {
      data: mapped.success,
      errors: mapped.errors,
      skipped: mapped.skipped,
    };
  }
}
