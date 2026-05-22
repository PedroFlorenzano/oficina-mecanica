import { ITimerLogRepository, TimerLogData } from "@/domain/repositories/ITimerLogRepository";
import { FinishTimerDTO } from "@/application/dtos/timer/FinishTimerDTO";
import {
  ForbiddenError,
  NotFoundError,
  BusinessRuleError,
} from "@/domain/errors/DomainError";

export class FinishTimer {
  constructor(private readonly timerLogRepo: ITimerLogRepository) {}

  async execute(dto: FinishTimerDTO & { userRole: string }): Promise<TimerLogData> {
    const { timerLogId, userId, tenantId, userRole } = dto;

    // Guard: somente MECHANIC pode finalizar cronômetro
    if (userRole !== "MECHANIC") {
      throw new ForbiddenError("Apenas mecânicos podem finalizar o cronômetro");
    }

    // Guard: TimerLog deve existir e pertencer ao tenant
    const timerLog = await this.timerLogRepo.findByIdForTenant(timerLogId, tenantId);
    if (!timerLog) {
      throw new NotFoundError("Cronômetro não encontrado");
    }

    // Guard: ownership — o TimerLog deve pertencer ao usuário autenticado
    if (timerLog.userId !== userId) {
      throw new ForbiddenError("Você não tem permissão para finalizar este cronômetro");
    }

    // Guard: estado deve ser Ativo ou Pausado (finishedAt === null)
    if (timerLog.finishedAt !== null) {
      throw new BusinessRuleError("O cronômetro já foi finalizado");
    }

    // Calcular totalSeconds final:
    // - Sessão Ativa: elapsed desde startedAt + totalSeconds acumulado
    // - Sessão Pausada: totalSeconds já foi calculado ao pausar; só registra finishedAt
    const finishedAt = new Date();
    const isActive = timerLog.pausedAt === null;
    const elapsed = isActive
      ? Math.floor((finishedAt.getTime() - timerLog.startedAt.getTime()) / 1000)
      : 0;
    const finalTotalSeconds = timerLog.totalSeconds + elapsed;

    // Persistir finalização
    const updatedLog = await this.timerLogRepo.updateFinish(
      timerLogId,
      finishedAt,
      finalTotalSeconds
    );

    // Recalcular timeMinutes do OrderService com base na soma de todas as sessões finalizadas
    const sumS = await this.timerLogRepo.sumFinishedSeconds(timerLog.orderServiceId);
    const timeMinutes = Math.floor(sumS / 60);
    await this.timerLogRepo.updateOrderServiceMinutes(timerLog.orderServiceId, timeMinutes);

    return updatedLog;
  }
}
