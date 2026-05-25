import { IServiceOrderRepository, ActiveOrder } from "@/domain/repositories/IServiceOrderRepository";

export class GetPista {
  constructor(private orderRepo: IServiceOrderRepository) {}

  async execute(tenantId: string): Promise<ActiveOrder[]> {
    return this.orderRepo.findActive(tenantId);
  }
}
