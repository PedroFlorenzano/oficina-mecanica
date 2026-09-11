import { IServiceOrderRepository, ActiveOrder } from "@/domain/repositories/IServiceOrderRepository";

/**
 * OS ativa enriquecida com o instante em que ela entrou no status atual.
 *
 * `statusSince` é derivado do `StatusHistory` (ver item 24/44 da spec): pega o
 * `createdAt` da última transição cujo `toStatus` é igual ao status atual da OS.
 * Quando não há histórico registrado (OS antiga, importada, etc.), cai para o
 * `createdAt` da própria OS — assim o cartão sempre tem uma referência de tempo.
 */
export interface PistaOrderWithStatusSince extends ActiveOrder {
  statusSince: Date;
}

export class GetPista {
  constructor(private orderRepo: IServiceOrderRepository) {}

  async execute(tenantId: string): Promise<PistaOrderWithStatusSince[]> {
    // findActive já filtra por tenantId (isolamento entre oficinas).
    const orders = await this.orderRepo.findActive(tenantId);

    // Enriquece cada OS com o momento em que entrou no status atual.
    // findById retorna statusHistory ordenado por createdAt desc; as OS aqui
    // pertencem ao tenant (vieram de findActive), então a leitura é segura.
    return Promise.all(
      orders.map(async (order) => {
        const detail = await this.orderRepo.findById(order.id);
        const statusSince = this.resolveStatusSince(
          detail?.statusHistory,
          order.status,
          order.createdAt
        );
        return { ...order, statusSince };
      })
    );
  }

  /**
   * Data em que a OS entrou no status atual. statusHistory chega ordenado por
   * createdAt desc, então a primeira entrada com toStatus === status é a mais
   * recente. Fallback: createdAt da OS.
   */
  private resolveStatusSince(
    history: { toStatus: string; createdAt: Date }[] | undefined,
    currentStatus: string,
    createdAt: Date
  ): Date {
    const entry = history?.find((h) => h.toStatus === currentStatus);
    return entry ? entry.createdAt : createdAt;
  }
}
