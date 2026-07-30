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

    // 3. Batch import clients
    let imported = 0;
    let updated = 0;
    const errors = [...mapped.errors];

    const BATCH_SIZE = 50;
    for (let i = 0; i < mapped.success.length; i += BATCH_SIZE) {
      const batch = mapped.success.slice(i, i + BATCH_SIZE);

      const results = await Promise.allSettled(
        batch.map(async (dto) => {
          const existing = await this.clientRepo.findByDocument(dto.document, tenantId);

          if (existing) {
            if (skipDuplicates) {
              return { action: "skipped" as const, dto };
            } else {
              await this.clientRepo.update(existing.id, {
                name: dto.name,
                phone: dto.phone,
                email: dto.email,
                address: dto.address,
                active: dto.active,
              });
              return { action: "updated" as const, dto };
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
            return { action: "imported" as const, dto };
          }
        })
      );

      for (const result of results) {
        if (result.status === "fulfilled") {
          if (result.value.action === "imported") imported++;
          else if (result.value.action === "updated") updated++;
          else mapped.skipped.push({ row: 0, reason: `Cliente "${result.value.dto.name}" já existe` });
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
