import { IServiceCatalogRepository } from "@/domain/repositories/IServiceCatalogRepository";
import { ValidationError } from "@/domain/errors/DomainError";
import { DeleteService } from "./DeleteService";

export interface BulkDeleteResult {
  deleted: string[];
  failed: { id: string; description?: string; reason: string }[];
}

/**
 * Exclui vários serviços do catálogo de uma vez.
 * Serviços vinculados a OSs não são excluídos — retornam em `failed` com o motivo,
 * para que a UI possa informar o usuário sem abortar o lote inteiro.
 */
export class BulkDeleteServices {
  constructor(private serviceRepo: IServiceCatalogRepository) {}

  async execute(ids: string[], tenantId: string): Promise<BulkDeleteResult> {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new ValidationError("Selecione ao menos um serviço para excluir");
    }

    const deleteService = new DeleteService(this.serviceRepo);
    const result: BulkDeleteResult = { deleted: [], failed: [] };

    for (const id of ids) {
      const service = await this.serviceRepo.findById(id);
      if (!service || service.tenantId !== tenantId) {
        result.failed.push({ id, reason: "Serviço não encontrado" });
        continue;
      }

      try {
        await deleteService.execute(id);
        result.deleted.push(id);
      } catch (error) {
        result.failed.push({
          id,
          description: service.description,
          reason: error instanceof Error ? error.message : "Erro ao excluir",
        });
      }
    }

    return result;
  }
}
