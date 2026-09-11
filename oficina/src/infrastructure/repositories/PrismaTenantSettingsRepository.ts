import { PrismaClient } from "@prisma/client";
import {
  ITenantSettingsRepository,
  TenantSettingsData,
  UpdateTenantSettingsInput,
} from "@/domain/repositories/ITenantSettingsRepository";

export class PrismaTenantSettingsRepository implements ITenantSettingsRepository {
  constructor(private readonly db: PrismaClient) {}

  async get(tenantId: string): Promise<TenantSettingsData | null> {
    return this.db.tenantSettings.findUnique({ where: { tenantId } });
  }

  async upsert(
    tenantId: string,
    data: UpdateTenantSettingsInput
  ): Promise<TenantSettingsData> {
    return this.db.tenantSettings.upsert({
      where: { tenantId },
      // create garante o mesmo tenantId da sessão; sem defaults do banco quando
      // o chamador manda os valores, senão o próprio schema aplica os defaults.
      create: {
        tenantId,
        ...(data.allowEditInProgress !== undefined
          ? { allowEditInProgress: data.allowEditInProgress }
          : {}),
        ...(data.uppercaseInputs !== undefined
          ? { uppercaseInputs: data.uppercaseInputs }
          : {}),
      },
      update: {
        ...(data.allowEditInProgress !== undefined
          ? { allowEditInProgress: data.allowEditInProgress }
          : {}),
        ...(data.uppercaseInputs !== undefined
          ? { uppercaseInputs: data.uppercaseInputs }
          : {}),
      },
    });
  }
}
