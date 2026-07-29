import { IStockItemRepository } from "@/domain/repositories/IStockItemRepository";
import { FileParser } from "@/application/use-cases/import/parsers/FileParser";
import { StockItemMapper, ImportStockItemDTO, ImportError, ImportSkipped } from "@/application/use-cases/import/parsers/DataMappers";

export interface ImportStockInput {
  buffer: Buffer;
  filename: string;
  tenantId: string;
  skipDuplicates?: boolean;
}

export interface ImportStockOutput {
  imported: number;
  updated: number;
  skipped: number;
  errors: ImportError[];
  skippedRows: ImportSkipped[];
  warnings: string[];
}

export class ImportStock {
  constructor(private stockRepo: IStockItemRepository) {}

  async execute(input: ImportStockInput): Promise<ImportStockOutput> {
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
    const mapped = StockItemMapper.map(parsed.rows);

    // 3. Import each valid stock item
    let imported = 0;
    let updated = 0;
    const errors = [...mapped.errors];

    for (const dto of mapped.success) {
      try {
        const existing = await this.stockRepo.findByCode(dto.code, tenantId);

        if (existing) {
          if (skipDuplicates) {
            mapped.skipped.push({
              row: 0,
              reason: `Item "${dto.code}" já existe (${dto.description})`,
            });
          } else {
            await this.stockRepo.update(existing.id, {
              description: dto.description,
              brand: dto.brand,
              unit: dto.unit,
              quantity: dto.quantity,
              costPrice: dto.costPrice,
              avgCost: dto.costPrice,
            });
            updated++;
          }
        } else {
          await this.stockRepo.create({
            code: dto.code,
            barcode: dto.reference,
            description: dto.description,
            brand: dto.brand,
            unit: dto.unit,
            minQuantity: 0,
            quantity: dto.quantity,
            location: null,
            supplier: null,
            costPrice: dto.costPrice,
            sellPrice: 0,
            avgCost: dto.costPrice,
            profitMargin: 0,
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
          message: `Erro ao importar item "${dto.code}": ${err instanceof Error ? err.message : String(err)}`,
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
  ): Promise<{ data: ImportStockItemDTO[]; errors: ImportError[]; skipped: ImportSkipped[] }> {
    const parsed = FileParser.parse(buffer, filename);
    const mapped = StockItemMapper.map(parsed.rows);
    return {
      data: mapped.success,
      errors: mapped.errors,
      skipped: mapped.skipped,
    };
  }
}
