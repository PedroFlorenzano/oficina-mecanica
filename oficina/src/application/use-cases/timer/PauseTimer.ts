import { ITimerLogRepository, TimerLogData } from "@/domain/repositories/ITimerLogRepository";
import {
  ForbiddenError,
  NotFoundError,
  BusinessRuleError,
  ValidationError,
} from "@/domain/errors/DomainError";
import { PauseTimerDTO } from "@/application/dtos/timer/PauseTimerDTO";

export class PauseTimer {
  constructor(private timerLogRepo: ITimerLogRepository) {}

  async execute(dto: PauseTimerDTO & { userRole: string }): Promise<TimerLogData> {
    const { timerLogId, pauseReason, userId, tenantId, userRole } = dto;

    // Guard: somente MECHANIC pode pausar cronômetro
    if (userRole !== "MECHANIC") {
      throw new ForbiddenError("Apenas mecânicos podem pausar o cronômetro");
    }

    // Guard: validar pauseReason antes de buscar o registro (fail fast)
    const trimmedReason = (pauseReason ?? "").trim();
    if (trimmedReason.length < 3 || trimmedReason.length > 255) {
      throw new ValidationError(
        "O motivo da pausa é obrigatório e deve ter entre 3 e 255 caracteres"
      );
    }

    // Guard: TimerLog deve existir e pertencer ao tenant
    const timerLog = await this.timerLogRepo.findByIdForTenant(timerLogId, tenantId);
    if (!timerLog) {
      throw new NotFoundError("Cronômetro não encontrado");
    }

    // Guard: ownership — o TimerLog deve pertencer ao usuário autenticado
    if (timerLog.userId !== userId) {
      throw new ForbiddenError("Você não tem permissão para pausar este cronômetro");
    }

    // Guard: estado deve ser Ativo (pausedAt === null && finishedAt === null)
    if (timerLog.pausedAt !== null || timerLog.finishedAt !== null) {
      throw new BusinessRuleError("O cronômetro não está em andamento e não pode ser pausado");
    }

    // Calcular totalSeconds da sessão atual (tempo parcial)
    const pausedAt = new Date();
    const totalSeconds = Math.floor(
      (pausedAt.getTime() - timerLog.startedAt.getTime()) / 1000
    );

    // Persistir pausa
    return this.timerLogRepo.updatePause(timerLogId, pausedAt, trimmedReason, totalSeconds);
  }
}
