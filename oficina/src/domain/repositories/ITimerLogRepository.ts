// Camada de domínio — sem importações de framework (Next.js, Prisma, React)

export interface TimerLogData {
  id: string;
  startedAt: Date;
  pausedAt: Date | null;
  finishedAt: Date | null;
  pauseReason: string | null;
  totalSeconds: number;
  orderServiceId: string;
  userId: string;
  createdAt: Date;
}

export interface TimerServiceSummary {
  orderServiceId: string;
  serviceDescription: string;
  mechanicName: string | null;
  netSeconds: number;
  status: "sem sessão" | "ativa" | "pausada" | "finalizada";
  logs: TimerLogData[];
}

export interface TimerAuditLogData {
  timerLogId: string;
  adminUserId: string;
  previousTotalSeconds: number;
  newTotalSeconds: number;
  changedAt: Date;
}

export interface ITimerLogRepository {
  /** Cria um novo registro de TimerLog */
  create(data: Omit<TimerLogData, "id" | "createdAt">): Promise<TimerLogData>;

  /** Busca um TimerLog pelo seu id */
  findById(id: string): Promise<TimerLogData | null>;

  /** Busca um TimerLog pelo id validando que pertence ao tenant (via OrderService → ServiceOrder) */
  findByIdForTenant(id: string, tenantId: string): Promise<TimerLogData | null>;

  /** Retorna o TimerLog ativo ou pausado de um serviço para um determinado mecânico */
  findActiveOrPausedByServiceAndUser(
    orderServiceId: string,
    userId: string
  ): Promise<TimerLogData | null>;

  /** Lista todos os TimerLogs associados a um OrderService, ordenados por startedAt asc */
  findByOrderServiceId(orderServiceId: string): Promise<TimerLogData[]>;

  /** Retorna o resumo de cronômetros de todos os serviços de uma OS, agrupados por OrderService */
  findByOrderId(orderId: string, tenantId: string): Promise<TimerServiceSummary[]>;

  /** Atualiza apenas o campo totalSeconds de um TimerLog */
  updateTotalSeconds(id: string, totalSeconds: number): Promise<TimerLogData>;

  /** Registra a pausa de um TimerLog (pausedAt, pauseReason e totalSeconds parcial) */
  updatePause(
    id: string,
    pausedAt: Date,
    pauseReason: string,
    totalSeconds: number
  ): Promise<TimerLogData>;

  /** Registra a finalização de um TimerLog (finishedAt e totalSeconds final) */
  updateFinish(id: string, finishedAt: Date, totalSeconds: number): Promise<TimerLogData>;

  /** Soma o totalSeconds de todas as sessões finalizadas de um OrderService */
  sumFinishedSeconds(orderServiceId: string): Promise<number>;

  /** Atualiza o campo timeMinutes do OrderService com o valor calculado */
  updateOrderServiceMinutes(orderServiceId: string, timeMinutes: number): Promise<void>;

  /** Registra um log de auditoria para correção manual de totalSeconds pelo administrador */
  createAuditLog(data: TimerAuditLogData): Promise<void>;
}
