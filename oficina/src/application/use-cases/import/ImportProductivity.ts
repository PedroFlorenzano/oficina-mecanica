import { FileParser } from "@/application/use-cases/import/parsers/FileParser";
import { ProductivityMapper, ImportProductivityDTO, ImportError, ImportSkipped } from "@/application/use-cases/import/parsers/HistoryMappers";

export interface ImportProductivityInput {
  buffer: Buffer;
  filename: string;
  tenantId: string;
}

export interface ImportProductivityOutput {
  imported: number;
  skipped: number;
  errors: ImportError[];
  skippedRows: ImportSkipped[];
  warnings: string[];
  summary: {
    totalRecords: number;
    mechanics: { name: string; services: number; totalMinutes: number }[];
  };
}

/**
 * Importa dados de produtividade como referência histórica.
 * O Operare tem seu próprio cronômetro — estes dados servem para comparação
 * com o sistema anterior.
 */
export class ImportProductivity {
  async execute(input: ImportProductivityInput): Promise<ImportProductivityOutput> {
    const { buffer, filename } = input;

    const parsed = FileParser.parse(buffer, filename);
    if (parsed.rows.length === 0) {
      return {
        imported: 0, skipped: 0,
        errors: [{ row: 0, message: "Arquivo vazio" }],
        skippedRows: [], warnings: [],
        summary: { totalRecords: 0, mechanics: [] },
      };
    }

    const mapped = ProductivityMapper.map(parsed.rows);

    // Aggregate by mechanic
    const mechMap = new Map<string, { services: number; totalMinutes: number }>();
    for (const dto of mapped.success) {
      const existing = mechMap.get(dto.mechanicName) || { services: 0, totalMinutes: 0 };
      existing.services++;
      existing.totalMinutes += dto.durationMinutes;
      mechMap.set(dto.mechanicName, existing);
    }

    const mechanics = Array.from(mechMap.entries()).map(([name, data]) => ({
      name,
      services: data.services,
      totalMinutes: Math.round(data.totalMinutes * 100) / 100,
    }));

    return {
      imported: mapped.success.length,
      skipped: mapped.skipped.length,
      errors: mapped.errors,
      skippedRows: mapped.skipped,
      warnings: [
        `Dados de produtividade importados como referência (${mapped.success.length} registros).`,
        "O cronômetro do Operare calcula tempo automaticamente — estes dados servem para comparação.",
      ],
      summary: { totalRecords: mapped.success.length, mechanics },
    };
  }

  async preview(buffer: Buffer, filename: string): Promise<{ data: ImportProductivityDTO[]; errors: ImportError[]; skipped: ImportSkipped[] }> {
    const parsed = FileParser.parse(buffer, filename);
    const mapped = ProductivityMapper.map(parsed.rows);
    return { data: mapped.success, errors: mapped.errors, skipped: mapped.skipped };
  }
}
