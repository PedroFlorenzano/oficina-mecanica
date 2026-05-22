import { IClientRepository } from "@/domain/repositories/IClientRepository";
import { NotFoundError, ConflictError } from "@/domain/errors/DomainError";

export class ActivateClient {
  constructor(private clientRepo: IClientRepository) {}

  async execute(clientId: string, tenantId: string): Promise<{ success: true }> {
    // TODO: integrar com auth — substituir DEMO_TENANT_ID por tenantId real do JWT
    const client = await this.clientRepo.findById(clientId, tenantId);
    if (!client) {
      throw new NotFoundError("Cliente não encontrado");
    }
    if (client.active) {
      throw new ConflictError("Cliente já está ativo");
    }
    await this.clientRepo.update(clientId, { active: true });
    return { success: true };
  }
}
