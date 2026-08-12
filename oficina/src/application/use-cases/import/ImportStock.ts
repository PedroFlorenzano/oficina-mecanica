import { IStockItemRepository } from "@/domain/repositories/IStockItemRepository";
import { FileParser } from "@/application/use-cases/import/parsers/FileParser";
import { StockItemMapper, ImportStockItemDTO, ImportError, ImportSkipped } from "@/application/use-cases/import/parsers/DataMappers";

export interface ImportStockInput {
  buffer: Buffer;
  filename: string;
  tenantId: string;
  skipDuplicates?: boolean;
  chunk?: number;
  chunkSize?: number;
  skipRows?: Set<number>;
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
    const mapped = StockItemMapper.map(parsed.rows);

    // 3. Batch import — process in chunks to avoid timeout
    let imported = 0;
    let updated = 0;
    const errors = [...mapped.errors];

    // Chunking support
    let itemsToProcess = mapped.success;
    if (skipRows && skipRows.size > 0) {
      itemsToProcess = itemsToProcess.filter((_, i) => !skipRows.has(i));
    }
    if (chunk !== undefined) {
      const start = chunk * chunkSize;
      itemsToProcess = mapped.success.slice(start, start + chunkSize);
    }

    // Process in batches of 50
    const BATCH_SIZE = 50;
    for (let i = 0; i < itemsToProcess.length; i += BATCH_SIZE) {
      const batch = itemsToProcess.slice(i, i + BATCH_SIZE);

      const results = await Promise.allSettled(
        batch.map(async (dto) => {
          const existing = await this.stockRepo.findByCode(dto.code, tenantId);

          if (existing) {
            if (skipDuplicates) {
              return { action: "skipped" as const, dto };
            } else {
              await this.stockRepo.update(existing.id, {
                description: dto.description,
                brand: dto.brand,
                unit: dto.unit,
                quantity: dto.quantity,
                costPrice: dto.costPrice,
                avgCost: dto.costPrice,
              });
              return { action: "updated" as const, dto };
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
            return { action: "imported" as const, dto };
          }
        })
      );

      for (const result of results) {
        if (result.status === "fulfilled") {
          if (result.value.action === "imported") imported++;
          else if (result.value.action === "updated") updated++;
          else mapped.skipped.push({ row: 0, reason: `Item "${result.value.dto.code}" já existe` });
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
