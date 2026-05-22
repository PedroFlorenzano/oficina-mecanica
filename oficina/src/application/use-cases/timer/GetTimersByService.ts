import {
  ITimerLogRepository,
  TimerLogData,
} from "@/domain/repositories/ITimerLogRepository";
import { NotFoundError } from "@/domain/errors/DomainError";
import { prisma } from "@/infrastructure/database/prisma";

export interface GetTimersByServiceInput {
  orderServiceId: string;
  tenantId: string;
}

export interface GetTimersByServiceResult {
  logs: TimerLogData[];
  netSeconds: number;
  status: "sem sessão" | "ativa" | "pausada" | "finalizada";
}

export class GetTimersByService {
  constructor(private readonly timerLogRepository: ITimerLogRepository) {}

  async execute(input: GetTimersByServiceInput): Promise<GetTimersByServiceResult> {
    const { orderServiceId, tenantId } = input;

    // Guard: o OrderService deve existir e pertencer ao tenant
    const orderService = await prisma.orderService.findFirst({
      where: {
        id: orderServiceId,
        order: { tenantId },
      },
    });

    if (!orderService) {
      throw new NotFoundError("Serviço não encontrado");
    }

    // Buscar todos os TimerLogs do serviço ordenados por startedAt ASC
    const logs = await this.timerLogRepository.findByOrderServiceId(orderServiceId);

    // Calcular tempo líquido: soma de totalSeconds das sessões Finalizadas
    const netSeconds = logs
      .filter((log) => log.finishedAt !== null)
      .reduce((acc, log) => acc + log.totalSeconds, 0);

    // Derivar status com precedência: ativa → pausada → finalizada → sem sessão
    let status: GetTimersByServiceResult["status"];

    if (logs.some((log) => log.finishedAt === null && log.pausedAt === null)) {
      status = "ativa";
    } else if (logs.some((log) => log.pausedAt !== null && log.finishedAt === null)) {
      status = "pausada";
    } else if (logs.length > 0 && logs.every((log) => log.finishedAt !== null)) {
      status = "finalizada";
    } else {
      status = "sem sessão";
    }

    return { logs, netSeconds, status };
  }
}
