import { ITimerLogRepository, TimerLogData } from "@/domain/repositories/ITimerLogRepository";
import {
  ForbiddenError,
  NotFoundError,
  BusinessRuleError,
} from "@/domain/errors/DomainError";
import { ResumeTimerDTO } from "@/application/dtos/timer/ResumeTimerDTO";

export class ResumeTimer {
  constructor(private readonly timerLogRepo: ITimerLogRepository) {}

  async execute(dto: ResumeTimerDTO & { userRole: string }): Promise<TimerLogData> {
    const { timerLogId, userId, tenantId, userRole } = dto;

    // Guard: somente MECHANIC pode retomar cronômetro
    if (userRole !== "MECHANIC") {
      throw new ForbiddenError("Apenas mecânicos podem retomar o cronômetro");
    }

    // Guard: TimerLog deve existir e pertencer ao tenant
    const timerLog = await this.timerLogRepo.findByIdForTenant(timerLogId, tenantId);
    if (!timerLog) {
      throw new NotFoundError("Cronômetro não encontrado");
    }

    // Guard: ownership — o TimerLog deve pertencer ao usuário autenticado
    if (timerLog.userId !== userId) {
      throw new ForbiddenError("Você não tem permissão para retomar este cronômetro");
    }

    // Guard: estado deve ser Pausado (pausedAt !== null && finishedAt === null)
    if (timerLog.pausedAt === null || timerLog.finishedAt !== null) {
      throw new BusinessRuleError("O cronômetro não está pausado e não pode ser retomado");
    }

    // Calcular e consolidar totalSeconds do TimerLog pausado:
    // elapsed = floor((pausedAt - startedAt) / 1000)
    // consolidatedTotal = totalSeconds acumulado + elapsed da sessão atual
    const elapsed = Math.floor(
      (timerLog.pausedAt.getTime() - timerLog.startedAt.getTime()) / 1000
    );
    const consolidatedTotal = timerLog.totalSeconds + elapsed;

    // Persistir totalSeconds consolidado no TimerLog pausado
    // (pausedAt já foi definido pelo PauseTimer)
    await this.timerLogRepo.updateTotalSeconds(timerLogId, consolidatedTotal);

    // Criar novo TimerLog Ativo para a mesma sessão de trabalho
    const now = new Date();
    return this.timerLogRepo.create({
      orderServiceId: timerLog.orderServiceId,
      userId: timerLog.userId,
      startedAt: now,
      pausedAt: null,
      finishedAt: null,
      pauseReason: null,
      totalSeconds: 0,
    });
  }
}
