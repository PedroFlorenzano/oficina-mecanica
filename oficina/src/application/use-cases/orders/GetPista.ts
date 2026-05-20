import { IServiceOrderRepository } from "@/domain/repositories/IServiceOrderRepository";

export class GetPista {
  constructor(private orderRepo: IServiceOrderRepository) {}

  async execute(tenantId: string): Promise<any[]> {
    return this.orderRepo.findActive(tenantId);
  }
}
