import { ITimerLogRepository, TimerLogData } from "@/domain/repositories/ITimerLogRepository";
import { CorrectTimerDTO } from "@/application/dtos/timer/CorrectTimerDTO";
import {
  ForbiddenError,
  NotFoundError,
  BusinessRuleError,
  ValidationError,
} from "@/domain/errors/DomainError";

export class CorrectTimer {
  constructor(private readonly timerLogRepo: ITimerLogRepository) {}

  async execute(dto: CorrectTimerDTO & { userRole: string }): Promise<TimerLogData> {
    const { timerLogId, newTotalSeconds, adminUserId, tenantId, userRole } = dto;

    // Guard 1: somente ADMIN pode corrigir cronômetros
    if (userRole !== "ADMIN") {
      throw new ForbiddenError("Apenas administradores podem corrigir o tempo de um cronômetro");
    }

    // Guard 2: TimerLog deve existir e pertencer ao tenant
    const timerLog = await this.timerLogRepo.findByIdForTenant(timerLogId, tenantId);
    if (!timerLog) {
      throw new NotFoundError("Cronômetro não encontrado");
    }

    // Guard 3: somente sessões finalizadas podem ser corrigidas
    if (timerLog.finishedAt === null) {
      throw new BusinessRuleError(
        "Somente cronômetros finalizados podem ser corrigidos"
      );
    }

    // Guard 4: newTotalSeconds deve ser inteiro no intervalo [0, 86400]
    if (
      !Number.isInteger(newTotalSeconds) ||
      newTotalSeconds < 0 ||
      newTotalSeconds > 86400
    ) {
      throw new ValidationError(
        "O valor de tempo deve ser um número inteiro entre 0 e 86400 segundos"
      );
    }

    // Capturar valor anterior para auditoria
    const previousTotalSeconds = timerLog.totalSeconds;

    // Persistir novo totalSeconds
    const updatedLog = await this.timerLogRepo.updateTotalSeconds(timerLogId, newTotalSeconds);

    // Recalcular e persistir OrderService.timeMinutes com base na soma atualizada
    const sumS = await this.timerLogRepo.sumFinishedSeconds(timerLog.orderServiceId);
    const timeMinutes = Math.floor(sumS / 60);
    await this.timerLogRepo.updateOrderServiceMinutes(timerLog.orderServiceId, timeMinutes);

    // Registrar log de auditoria
    await this.timerLogRepo.createAuditLog({
      timerLogId,
      adminUserId,
      previousTotalSeconds,
      newTotalSeconds,
      changedAt: new Date(),
    });

    return updatedLog;
  }
}
