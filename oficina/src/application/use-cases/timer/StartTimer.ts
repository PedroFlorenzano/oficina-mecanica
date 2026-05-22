import { ITimerLogRepository, TimerLogData } from "@/domain/repositories/ITimerLogRepository";
import { StartTimerDTO } from "@/application/dtos/timer/StartTimerDTO";
import {
  ForbiddenError,
  NotFoundError,
  ConflictError,
  BusinessRuleError,
} from "@/domain/errors/DomainError";
import { prisma } from "@/infrastructure/database/prisma";

const CLOSED_STATUSES = ["COMPLETED", "CANCELLED", "DELIVERED"] as const;

export class StartTimer {
  constructor(private readonly timerLogRepository: ITimerLogRepository) {}

  async execute(
    input: StartTimerDTO & { userRole: string }
  ): Promise<TimerLogData> {
    const { orderServiceId, userId, tenantId, userRole } = input;

    // Guard 1: apenas mecânicos podem iniciar cronômetros
    if (userRole !== "MECHANIC") {
      throw new ForbiddenError(
        "Apenas mecânicos podem iniciar o cronômetro de um serviço"
      );
    }

    // Guard 2: o OrderService deve existir e pertencer ao tenant
    const orderService = await prisma.orderService.findFirst({
      where: { id: orderServiceId },
      include: {
        order: {
          select: { tenantId: true, status: true },
        },
      },
    });

    if (!orderService || orderService.order.tenantId !== tenantId) {
      throw new NotFoundError("Serviço não encontrado");
    }

    // Guard 3: a OS pai não pode estar encerrada
    if (CLOSED_STATUSES.includes(orderService.order.status as (typeof CLOSED_STATUSES)[number])) {
      throw new BusinessRuleError(
        "Não é possível iniciar o cronômetro de um serviço em uma OS já encerrada"
      );
    }

    // Guard 4: se o serviço está atribuído a outro mecânico, rejeitar
    if (
      orderService.mechanicId !== null &&
      orderService.mechanicId !== userId
    ) {
      throw new ForbiddenError(
        "Este serviço está atribuído a outro mecânico"
      );
    }

    // Guard 5: não pode existir sessão ativa ou pausada para este serviço e mecânico
    const existingSession =
      await this.timerLogRepository.findActiveOrPausedByServiceAndUser(
        orderServiceId,
        userId
      );

    if (existingSession) {
      throw new ConflictError(
        "Já existe um cronômetro em andamento para este serviço"
      );
    }

    // Criar novo TimerLog no estado Ativo
    const now = new Date();

    return this.timerLogRepository.create({
      orderServiceId,
      userId,
      startedAt: now,
      pausedAt: null,
      finishedAt: null,
      pauseReason: null,
      totalSeconds: 0,
    });
  }
}
