import { FileParser } from "@/application/use-cases/import/parsers/FileParser";
import { FinancialMapper, ImportFinancialDTO, ImportError, ImportSkipped } from "@/application/use-cases/import/parsers/HistoryMappers";

export interface ImportFinancialInput {
  buffer: Buffer;
  filename: string;
  tenantId: string;
  skipRows?: Set<number>;
}

export interface ImportFinancialOutput {
  imported: number;
  skipped: number;
  errors: ImportError[];
  skippedRows: ImportSkipped[];
  warnings: string[];
  summary: {
    totalCredits: number;
    totalDebits: number;
    balance: number;
    paid: number;
    pending: number;
  };
}

/**
 * Importa registros financeiros como dados de referência.
 * Nota: O Operare não tem uma tabela dedicada de "contas a pagar/receber" —
 * os dados são importados como resumo para consulta histórica.
 * Os dados ficam acessíveis via preview (não persiste no banco por enquanto).
 */
export class ImportFinancial {
  async execute(input: ImportFinancialInput): Promise<ImportFinancialOutput> {
    const { buffer, filename } = input;

    const parsed = FileParser.parse(buffer, filename);
    if (parsed.rows.length === 0) {
      return {
        imported: 0, skipped: 0,
        errors: [{ row: 0, message: "Arquivo vazio" }],
        skippedRows: [], warnings: [],
        summary: { totalCredits: 0, totalDebits: 0, balance: 0, paid: 0, pending: 0 },
      };
    }

    const mapped = FinancialMapper.map(parsed.rows);

    // Calculate summary
    let totalCredits = 0;
    let totalDebits = 0;
    let paid = 0;
    let pending = 0;

    for (const dto of mapped.success) {
      if (dto.type === "CREDIT") totalCredits += dto.amount;
      else totalDebits += dto.amount;
      if (dto.status === "PAGA") paid++;
      else pending++;
    }

    return {
      imported: mapped.success.length,
      skipped: mapped.skipped.length,
      errors: mapped.errors,
      skippedRows: mapped.skipped,
      warnings: [
        `Dados financeiros importados como referência histórica (${mapped.success.length} registros).`,
        "O Operare calcula faturamento automaticamente a partir das OS — estes dados servem para comparação.",
      ],
      summary: {
        totalCredits: Math.round(totalCredits * 100) / 100,
        totalDebits: Math.round(totalDebits * 100) / 100,
        balance: Math.round((totalCredits - totalDebits) * 100) / 100,
        paid,
        pending,
      },
    };
  }

  async preview(buffer: Buffer, filename: string): Promise<{ data: ImportFinancialDTO[]; errors: ImportError[]; skipped: ImportSkipped[] }> {
    const parsed = FileParser.parse(buffer, filename);
    const mapped = FinancialMapper.map(parsed.rows);
    return { data: mapped.success, errors: mapped.errors, skipped: mapped.skipped };
  }
}
