import { IClientRepository } from "@/domain/repositories/IClientRepository";
import { IServiceOrderRepository, OrderSummary } from "@/domain/repositories/IServiceOrderRepository";
import { NotFoundError } from "@/domain/errors/DomainError";

export class GetClientHistory {
  constructor(
    private clientRepo: IClientRepository,
    private orderRepo: IServiceOrderRepository
  ) {}

  async execute(clientId: string, tenantId: string): Promise<OrderSummary[]> {
    // TODO: integrar com auth
    const client = await this.clientRepo.findById(clientId, tenantId);
    if (!client) {
      throw new NotFoundError("Cliente não encontrado");
    }
    return this.orderRepo.findByClientId(clientId, tenantId);
  }
}
