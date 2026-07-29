import { IClientRepository } from "@/domain/repositories/IClientRepository";
import { FileParser } from "@/application/use-cases/import/parsers/FileParser";
import { ClientMapper, ImportClientDTO, ImportError, ImportSkipped } from "@/application/use-cases/import/parsers/DataMappers";

export interface ImportClientsInput {
  buffer: Buffer;
  filename: string;
  tenantId: string;
  skipDuplicates?: boolean; // true = skip, false = update existing
}

export interface ImportClientsOutput {
  imported: number;
  updated: number;
  skipped: number;
  errors: ImportError[];
  skippedRows: ImportSkipped[];
  warnings: string[];
}

export class ImportClients {
  constructor(private clientRepo: IClientRepository) {}

  async execute(input: ImportClientsInput): Promise<ImportClientsOutput> {
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
    const mapped = ClientMapper.map(parsed.rows);

    // 3. Import each valid client
    let imported = 0;
    let updated = 0;
    const errors = [...mapped.errors];

    for (const dto of mapped.success) {
      try {
        const existing = await this.clientRepo.findByDocument(
          dto.document,
          tenantId
        );

        if (existing) {
          if (skipDuplicates) {
            mapped.skipped.push({
              row: 0,
              reason: `Cliente "${dto.name}" (${dto.document}) já existe`,
            });
          } else {
            // Update existing
            await this.clientRepo.update(existing.id, {
              name: dto.name,
              phone: dto.phone,
              email: dto.email,
              address: dto.address,
              active: dto.active,
            });
            updated++;
          }
        } else {
          await this.clientRepo.create({
            name: dto.name,
            document: dto.document,
            docType: dto.docType,
            phone: dto.phone,
            email: dto.email,
            address: dto.address,
            active: dto.active,
            tenantId,
          });
          imported++;
        }
      } catch (err) {
        errors.push({
          row: 0,
          field: "documento",
          value: dto.document,
          message: `Erro ao importar "${dto.name}": ${err instanceof Error ? err.message : String(err)}`,
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

  /**
   * Preview: parseia e mapeia sem salvar no banco.
   */
  async preview(
    buffer: Buffer,
    filename: string
  ): Promise<{ data: ImportClientDTO[]; errors: ImportError[]; skipped: ImportSkipped[] }> {
    const parsed = FileParser.parse(buffer, filename);
    const mapped = ClientMapper.map(parsed.rows);
    return {
      data: mapped.success,
      errors: mapped.errors,
      skipped: mapped.skipped,
    };
  }
}
