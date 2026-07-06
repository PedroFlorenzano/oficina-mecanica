/**
 * Calcula dias úteis baseado no calendário de funcionamento da oficina.
 * Reutiliza os dados do ScheduleConfig (workDays, startTime, endTime, lunchStart, lunchEnd).
 */
export class WorkDayCalculator {
  private readonly workDaysSet: Set<number>;
  private readonly workMinutesPerDay: number;

  constructor(
    private readonly workDays: number[], // [1,2,3,4,5,6] = seg a sáb
    private readonly startTime: string, // "08:00"
    private readonly endTime: string, // "18:00"
    private readonly lunchStart?: string | null, // "12:00"
    private readonly lunchEnd?: string | null // "13:00"
  ) {
    this.workDaysSet = new Set(workDays);
    this.workMinutesPerDay = this.calculateWorkMinutesPerDay();
  }

  private calculateWorkMinutesPerDay(): number {
    const start = this.timeToMinutes(this.startTime);
    const end = this.timeToMinutes(this.endTime);
    let total = end - start;

    if (this.lunchStart && this.lunchEnd) {
      const lunchS = this.timeToMinutes(this.lunchStart);
      const lunchE = this.timeToMinutes(this.lunchEnd);
      total -= lunchE - lunchS;
    }

    return Math.max(total, 0);
  }

  private timeToMinutes(time: string): number {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  }

  /**
   * Retorna minutos úteis de trabalho por dia.
   */
  getWorkMinutesPerDay(): number {
    return this.workMinutesPerDay;
  }

  /**
   * Retorna se um dia da semana é dia útil de trabalho.
   * @param dayOfWeek 0=domingo, 1=segunda, ..., 6=sábado
   */
  isWorkDay(dayOfWeek: number): boolean {
    return this.workDaysSet.has(dayOfWeek);
  }

  /**
   * Retorna se uma data específica é dia útil.
   */
  isWorkDate(date: Date): boolean {
    return this.isWorkDay(date.getDay());
  }

  /**
   * Converte minutos de trabalho em número de dias úteis.
   * Arredonda pra cima (ex: 541min com 540min/dia = 2 dias).
   */
  minutesToWorkDays(minutes: number): number {
    if (minutes <= 0 || this.workMinutesPerDay <= 0) return 0;
    return Math.ceil(minutes / this.workMinutesPerDay);
  }

  /**
   * Soma N dias úteis a partir de uma data.
   * Retorna a data do último dia útil + horário de fim do expediente.
   */
  addWorkDays(startDate: Date, days: number): Date {
    if (days <= 0) {
      return new Date(startDate);
    }

    const result = new Date(startDate);
    let added = 0;

    // Se o dia inicial não é útil, avança para o próximo útil
    while (!this.isWorkDate(result)) {
      result.setDate(result.getDate() + 1);
    }

    while (added < days) {
      result.setDate(result.getDate() + 1);
      if (this.isWorkDate(result)) {
        added++;
      }
    }

    // Setar horário para fim do expediente
    const [endH, endM] = this.endTime.split(":").map(Number);
    result.setHours(endH, endM, 0, 0);

    return result;
  }

  /**
   * Calcula quantos dias úteis existem entre duas datas (excluindo startDate, incluindo endDate).
   */
  countWorkDaysBetween(startDate: Date, endDate: Date): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    let count = 0;
    const current = new Date(start);
    current.setDate(current.getDate() + 1);

    while (current <= end) {
      if (this.isWorkDate(current)) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }

    return count;
  }

  /**
   * Factory a partir de dados do ScheduleConfig.
   */
  static fromConfig(config: {
    workDays: string; // JSON string "[1,2,3,4,5,6]"
    startTime: string;
    endTime: string;
    lunchStart?: string | null;
    lunchEnd?: string | null;
  }): WorkDayCalculator {
    const days: number[] = JSON.parse(config.workDays);
    return new WorkDayCalculator(
      days,
      config.startTime,
      config.endTime,
      config.lunchStart,
      config.lunchEnd
    );
  }
}
