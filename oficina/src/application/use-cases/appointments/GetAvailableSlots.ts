import { IAppointmentRepository, ScheduleConfigData } from "@/domain/repositories/IAppointmentRepository";

interface Slot {
  time: string; // "HH:MM"
  available: boolean;
}

export class GetAvailableSlots {
  constructor(private readonly repo: IAppointmentRepository) {}

  async execute(tenantId: string, dateStr: string): Promise<Slot[]> {
    const config = await this.repo.getConfig(tenantId);
    if (!config?.enabled) return [];

    const date = new Date(dateStr + "T00:00:00");
    const dayOfWeek = date.getDay();
    const workDays: number[] = JSON.parse(config.workDays);
    if (!workDays.includes(dayOfWeek)) return [];

    // Get existing appointments for that day
    const dayStart = new Date(dateStr + "T00:00:00");
    const dayEnd = new Date(dateStr + "T23:59:59");
    const appointments = await this.repo.findByDateRange(tenantId, dayStart, dayEnd);

    const slots = this.generateSlots(config);
    return slots.map((time) => {
      const slotDate = new Date(`${dateStr}T${time}:00`);
      const count = appointments.filter((a) => a.date.getTime() === slotDate.getTime()).length;
      return { time, available: count < config.maxPerSlot };
    });
  }

  private generateSlots(config: ScheduleConfigData): string[] {
    const slots: string[] = [];
    const [startH, startM] = config.startTime.split(":").map(Number);
    const [endH, endM] = config.endTime.split(":").map(Number);
    const lunchStart = config.lunchStart ? config.lunchStart.split(":").map(Number) : null;
    const lunchEnd = config.lunchEnd ? config.lunchEnd.split(":").map(Number) : null;

    let current = startH * 60 + startM;
    const end = endH * 60 + endM;
    const lunchS = lunchStart ? lunchStart[0] * 60 + lunchStart[1] : null;
    const lunchE = lunchEnd ? lunchEnd[0] * 60 + lunchEnd[1] : null;

    while (current < end) {
      // Skip lunch
      if (lunchS !== null && lunchE !== null && current >= lunchS && current < lunchE) {
        current = lunchE;
        continue;
      }
      const h = Math.floor(current / 60).toString().padStart(2, "0");
      const m = (current % 60).toString().padStart(2, "0");
      slots.push(`${h}:${m}`);
      current += config.slotDuration;
    }
    return slots;
  }
}
