import { FileParser } from "@/application/use-cases/import/parsers/FileParser";
import { InvoiceMapper, ImportInvoiceDTO, ImportError, ImportSkipped } from "@/application/use-cases/import/parsers/HistoryMappers";

export interface ImportInvoicesInput {
  buffer: Buffer;
  filename: string;
  tenantId: string;
  skipDuplicates?: boolean;
}

export interface ImportInvoicesOutput {
  imported: number;
  skipped: number;
  errors: ImportError[];
  skippedRows: ImportSkipped[];
  warnings: string[];
  summary: {
    total: number;
    authorized: number;
    cancelled: number;
    totalAmount: number;
  };
}

/**
 * Importa notas fiscais como referência histórica.
 * As notas do sistema anterior não podem ser "reabertas" — servem apenas para consulta.
 * Novas notas devem ser emitidas pelo módulo fiscal do Operare.
 */
export class ImportInvoices {
  async execute(input: ImportInvoicesInput): Promise<ImportInvoicesOutput> {
    const { buffer, filename } = input;

    const parsed = FileParser.parse(buffer, filename);
    if (parsed.rows.length === 0) {
      return {
        imported: 0, skipped: 0,
        errors: [{ row: 0, message: "Arquivo vazio" }],
        skippedRows: [], warnings: [],
        summary: { total: 0, authorized: 0, cancelled: 0, totalAmount: 0 },
      };
    }

    const mapped = InvoiceMapper.map(parsed.rows);

    let authorized = 0;
    let cancelled = 0;
    let totalAmount = 0;

    for (const dto of mapped.success) {
      if (dto.status === "AUTHORIZED") authorized++;
      if (dto.status === "CANCELLED") cancelled++;
      totalAmount += dto.totalAmount;
    }

    return {
      imported: mapped.success.length,
      skipped: mapped.skipped.length,
      errors: mapped.errors,
      skippedRows: mapped.skipped,
      warnings: [
        `${mapped.success.length} notas fiscais importadas como referência histórica.`,
        "Novas emissões devem ser feitas pelo módulo Fiscal do Operare.",
      ],
      summary: {
        total: mapped.success.length,
        authorized,
        cancelled,
        totalAmount: Math.round(totalAmount * 100) / 100,
      },
    };
  }

  async preview(buffer: Buffer, filename: string): Promise<{ data: ImportInvoiceDTO[]; errors: ImportError[]; skipped: ImportSkipped[] }> {
    const parsed = FileParser.parse(buffer, filename);
    const mapped = InvoiceMapper.map(parsed.rows);
    return { data: mapped.success, errors: mapped.errors, skipped: mapped.skipped };
  }
}
