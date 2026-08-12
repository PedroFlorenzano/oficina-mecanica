import { IServiceOrderRepository } from "@/domain/repositories/IServiceOrderRepository";
import { IClientRepository } from "@/domain/repositories/IClientRepository";
import { IVehicleRepository } from "@/domain/repositories/IVehicleRepository";
import { FileParser } from "@/application/use-cases/import/parsers/FileParser";
import { OrderMapper, ImportOrderDTO, ImportError, ImportSkipped } from "@/application/use-cases/import/parsers/HistoryMappers";

export interface ImportOrdersInput {
  buffer: Buffer;
  filename: string;
  tenantId: string;
  userId: string;
  skipDuplicates?: boolean;
  chunk?: number;
  chunkSize?: number;
  skipRows?: Set<number>;
}

export interface ImportOrdersOutput {
  imported: number;
  skipped: number;
  errors: ImportError[];
  skippedRows: ImportSkipped[];
  warnings: string[];
}

export class ImportOrders {
  constructor(
    private orderRepo: IServiceOrderRepository,
    private clientRepo: IClientRepository,
    private vehicleRepo: IVehicleRepository
  ) {}

  async execute(input: ImportOrdersInput): Promise<ImportOrdersOutput> {
    const { buffer, filename, tenantId, userId, skipDuplicates = true, chunk, chunkSize = 30, skipRows } = input;

    const parsed = FileParser.parse(buffer, filename);
    if (parsed.rows.length === 0) {
      return { imported: 0, skipped: 0, errors: [{ row: 0, message: "Arquivo vazio" }], skippedRows: [], warnings: [] };
    }

    const mapped = OrderMapper.map(parsed.rows);
    const errors = [...mapped.errors];
    const warnings = [...mapped.warnings];
    let imported = 0;

    // If chunk is specified, only process that slice
    let itemsToProcess = mapped.success;
    if (skipRows && skipRows.size > 0) {
      itemsToProcess = itemsToProcess.filter((_, i) => !skipRows.has(i));
    }
    if (chunk !== undefined) {
      const start = chunk * chunkSize;
      const end = start + chunkSize;
      itemsToProcess = mapped.success.slice(start, end);
    }

    // Build caches
    const allClients = await this.clientRepo.findAll(tenantId);
    const clientNameMap = new Map<string, string>();
    for (const c of allClients) clientNameMap.set(c.name.toUpperCase().trim(), c.id);

    const allVehicles = await this.vehicleRepo.findAll(tenantId);
    const vehiclePlateMap = new Map<string, string>();
    for (const v of allVehicles) vehiclePlateMap.set(v.plate.toUpperCase(), v.id);

    for (let i = 0; i < itemsToProcess.length; i += 10) {
      const batch = itemsToProcess.slice(i, i + 10);

      const results = await Promise.allSettled(
        batch.map(async (dto) => {
          // Find client
          let resolvedClientId = clientNameMap.get(dto.clientName.toUpperCase().trim());
          if (!resolvedClientId) {
            for (const [key, id] of clientNameMap.entries()) {
              if (key.includes(dto.clientName.toUpperCase().trim()) || dto.clientName.toUpperCase().trim().includes(key)) {
                resolvedClientId = id;
                break;
              }
            }
            if (!resolvedClientId) {
              return { action: "error" as const, dto, reason: `OS #${dto.number}: cliente "${dto.clientName}" não encontrado` };
            }
          }

          // Find vehicle
          let vehicleId: string | null = null;
          if (dto.plate) {
            vehicleId = vehiclePlateMap.get(dto.plate.toUpperCase()) || null;
          }
          if (!vehicleId) {
            const clientVehicles = allVehicles.filter(v => v.clientId === resolvedClientId);
            if (clientVehicles.length > 0) {
              vehicleId = clientVehicles[0].id;
            } else {
              return { action: "error" as const, dto, reason: `OS #${dto.number}: nenhum veículo encontrado para "${dto.clientName}"` };
            }
          }

          await this.orderRepo.createLegacy({
            mileage: 0,
            notes: `[Importado do Syscar] OS #${dto.number}${dto.paymentMethod ? " | Pgto: " + dto.paymentMethod : ""}${dto.mechanics ? " | Resp: " + dto.mechanics : ""}`.trim(),
            clientId: resolvedClientId!,
            vehicleId,
            tenantId,
            createdById: userId,
            services: dto.total > 0 ? [{ description: `Serviço importado (OS #${dto.number})`, price: dto.total }] : [],
          });
          return { action: "imported" as const, dto };
        })
      );

      for (const result of results) {
        if (result.status === "fulfilled") {
          if (result.value.action === "imported") imported++;
          else if (result.value.action === "error") errors.push({ row: 0, field: "cliente", value: result.value.dto.clientName, message: result.value.reason });
        } else {
          errors.push({ row: 0, message: result.reason?.message || "Erro desconhecido" });
        }
      }
    }

    return { imported, skipped: mapped.skipped.length, errors, skippedRows: mapped.skipped, warnings };
  }

  async preview(buffer: Buffer, filename: string): Promise<{ data: ImportOrderDTO[]; errors: ImportError[]; skipped: ImportSkipped[] }> {
    const parsed = FileParser.parse(buffer, filename);
    const mapped = OrderMapper.map(parsed.rows);
    return { data: mapped.success, errors: mapped.errors, skipped: mapped.skipped };
  }

  private parseDate(dateStr: string | null): Date | undefined {
    if (!dateStr) return undefined;
    // Handle "dd/mm/yyyy" format
    const parts = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (parts) return new Date(parseInt(parts[3]), parseInt(parts[2]) - 1, parseInt(parts[1]));
    // Handle Excel serial number
    const serial = parseFloat(dateStr);
    if (!isNaN(serial) && serial > 40000) {
      return new Date((serial - 25569) * 86400 * 1000);
    }
    return undefined;
  }
}
