import { IClientRepository } from "@/domain/repositories/IClientRepository";
import { NotFoundError, ConflictError } from "@/domain/errors/DomainError";

export class DeleteClient {
  constructor(private clientRepo: IClientRepository) {}

  async execute(clientId: string, tenantId: string): Promise<{ success: true }> {
    const client = await this.clientRepo.findById(clientId, tenantId);
    if (!client) {
      throw new NotFoundError("Cliente não encontrado");
    }
    if (!client.active) {
      throw new ConflictError("Cliente já está inativo");
    }
    await this.clientRepo.deactivate(clientId);
    return { success: true };
  }
}
