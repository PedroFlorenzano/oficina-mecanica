import { IClientRepository, ClientData } from "@/domain/repositories/IClientRepository";

export class SearchClients {
  constructor(private clientRepo: IClientRepository) {}

  async execute(query: string, tenantId: string): Promise<ClientData[]> {
    if (query) {
      return this.clientRepo.search(query, tenantId);
    }
    return this.clientRepo.findAll(tenantId);
  }
}
