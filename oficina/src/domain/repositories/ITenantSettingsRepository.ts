export interface TenantSettingsData {
  id: string;
  tenantId: string;
  /** Permite editar itens/valores de OS que já estão em andamento (IN_PROGRESS). */
  allowEditInProgress: boolean;
  /** Converte automaticamente os campos de texto do dashboard para MAIÚSCULAS. */
  uppercaseInputs: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Campos editáveis das configurações da oficina. */
export interface UpdateTenantSettingsInput {
  allowEditInProgress?: boolean;
  uppercaseInputs?: boolean;
}

export interface ITenantSettingsRepository {
  /**
   * Retorna a linha de configurações do tenant, ou `null` se ainda não existir.
   * Não grava nada. Toda consulta filtra por tenantId.
   */
  get(tenantId: string): Promise<TenantSettingsData | null>;

  /**
   * Cria ou atualiza (upsert) as configurações do tenant.
   * Toda consulta filtra por tenantId.
   */
  upsert(tenantId: string, data: UpdateTenantSettingsInput): Promise<TenantSettingsData>;
}
