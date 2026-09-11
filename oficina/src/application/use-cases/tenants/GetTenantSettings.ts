import {
  ITenantSettingsRepository,
  TenantSettingsData,
} from "@/domain/repositories/ITenantSettingsRepository";

/** Valores padrão quando ainda não existe linha de configuração para o tenant. */
export const DEFAULT_TENANT_SETTINGS = {
  allowEditInProgress: false,
  uppercaseInputs: false,
} as const;

export type TenantSettingsView = {
  allowEditInProgress: boolean;
  uppercaseInputs: boolean;
};

export class GetTenantSettings {
  constructor(private readonly repo: ITenantSettingsRepository) {}

  /**
   * Retorna as configurações da oficina. Se ainda não houver linha, devolve os
   * defaults SEM gravar no banco (qualquer usuário autenticado pode ler).
   */
  async execute(tenantId: string): Promise<TenantSettingsView> {
    const settings: TenantSettingsData | null = await this.repo.get(tenantId);
    if (!settings) {
      return { ...DEFAULT_TENANT_SETTINGS };
    }
    return {
      allowEditInProgress: settings.allowEditInProgress,
      uppercaseInputs: settings.uppercaseInputs,
    };
  }
}
