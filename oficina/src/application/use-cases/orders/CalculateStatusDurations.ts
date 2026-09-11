import { IServiceOrderRepository, StatusHistoryEntry } from "@/domain/repositories/IServiceOrderRepository";
import { NotFoundError, ForbiddenError } from "@/domain/errors/DomainError";

export interface StatusDuration {
  status: string;
  /** Tempo acumulado neste status, em milissegundos. */
  durationMs: number;
  /** true quando é o status atual (contado até agora). */
  current: boolean;
}

/**
 * Item 24 — tempo por status da OS, só para admin.
 *
 * A partir do StatusHistory (ordenado por createdAt), soma quanto tempo a OS
 * ficou em cada status. Cada transição fecha o intervalo do status anterior;
 * o último status conta do seu início até `now`.
 *
 * Restrição de admin aplicada no servidor: usuário não-ADMIN recebe ForbiddenError.
 */
export class CalculateStatusDurations {
  constructor(private orderRepo: IServiceOrderRepository) {}

  async execute(
    orderId: string,
    tenantId: string,
    userRole: string,
    now: Date = new Date()
  ): Promise<StatusDuration[]> {
    if (userRole !== "ADMIN") {
      throw new ForbiddenError("Apenas administradores podem ver o tempo por status");
    }

    const order = await this.orderRepo.findById(orderId);
    if (!order || order.tenantId !== tenantId) {
      throw new NotFoundError("Ordem de Serviço", orderId);
    }

    const history = await this.orderRepo.getStatusHistory(orderId);
    return CalculateStatusDurations.compute(history, now);
  }

  /**
   * Cálculo puro, testável com datas fixas. Entradas devem estar em ordem
   * cronológica crescente. Entradas com fromStatus == toStatus (edições
   * registradas para auditoria) não abrem um novo intervalo de status.
   */
  static compute(history: StatusHistoryEntry[], now: Date): StatusDuration[] {
    // Filtra as transições reais de status (ignora registros de edição/auditoria).
    const transitions = history.filter((h) => h.fromStatus !== h.toStatus || h.fromStatus === null);

    if (transitions.length === 0) return [];

    const totals = new Map<string, number>();
    const order: string[] = [];

    const add = (status: string, ms: number) => {
      if (!totals.has(status)) {
        totals.set(status, 0);
        order.push(status);
      }
      totals.set(status, (totals.get(status) ?? 0) + Math.max(0, ms));
    };

    for (let i = 0; i < transitions.length; i++) {
      const entry = transitions[i];
      const start = new Date(entry.createdAt).getTime();
      const next = transitions[i + 1];
      const end = next ? new Date(next.createdAt).getTime() : now.getTime();
      add(entry.toStatus, end - start);
    }

    const currentStatus = transitions[transitions.length - 1].toStatus;

    return order.map((status) => ({
      status,
      durationMs: totals.get(status) ?? 0,
      current: status === currentStatus,
    }));
  }
}
