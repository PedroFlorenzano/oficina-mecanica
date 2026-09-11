import { ITenantSettingsRepository } from "@/domain/repositories/ITenantSettingsRepository";
import { UpdateTenantSettingsDTO } from "@/application/dtos/UpdateTenantSettingsDTO";
import { ForbiddenError, ValidationError } from "@/domain/errors/DomainError";
import { TenantSettingsView } from "./GetTenantSettings";

export class UpdateTenantSettings {
  constructor(private readonly repo: ITenantSettingsRepository) {}

  /**
   * Atualiza as configurações da oficina. Restrito a ADMIN.
   */
  async execute(
    input: UpdateTenantSettingsDTO,
    tenantId: string,
    userRole: string
  ): Promise<TenantSettingsView> {
    if (userRole !== "ADMIN") {
      throw new ForbiddenError("Apenas administradores podem alterar as configurações da oficina");
    }

    const data: UpdateTenantSettingsDTO = {};

    if (input.allowEditInProgress !== undefined) {
      if (typeof input.allowEditInProgress !== "boolean") {
        throw new ValidationError("allowEditInProgress deve ser booleano");
      }
      data.allowEditInProgress = input.allowEditInProgress;
    }

    if (input.uppercaseInputs !== undefined) {
      if (typeof input.uppercaseInputs !== "boolean") {
        throw new ValidationError("uppercaseInputs deve ser booleano");
      }
      data.uppercaseInputs = input.uppercaseInputs;
    }

    const saved = await this.repo.upsert(tenantId, data);
    return {
      allowEditInProgress: saved.allowEditInProgress,
      uppercaseInputs: saved.uppercaseInputs,
    };
  }
}
