import {
  ITimerLogRepository,
  TimerServiceSummary,
} from "@/domain/repositories/ITimerLogRepository";
import { NotFoundError } from "@/domain/errors/DomainError";
import { prisma } from "@/infrastructure/database/prisma";

export interface GetTimersByOrderInput {
  orderId: string;
  tenantId: string;
}

export class GetTimersByOrder {
  constructor(private readonly timerLogRepository: ITimerLogRepository) {}

  async execute(input: GetTimersByOrderInput): Promise<TimerServiceSummary[]> {
    const { orderId, tenantId } = input;

    // Validar existência da OS no tenant
    const serviceOrder = await prisma.serviceOrder.findFirst({
      where: { id: orderId, tenantId },
    });

    if (!serviceOrder) {
      throw new NotFoundError("OS não encontrada");
    }

    // Delegar toda a lógica de agrupamento, cálculo de netSeconds,
    // derivação de status e resolução do nome do mecânico ao repositório
    return this.timerLogRepository.findByOrderId(orderId, tenantId);
  }
}
