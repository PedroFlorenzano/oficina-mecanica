export interface ScheduleConfigData {
  id: string;
  tenantId: string;
  slotDuration: number;
  maxPerSlot: number;
  workDays: string;
  startTime: string;
  endTime: string;
  lunchStart: string | null;
  lunchEnd: string | null;
  enabled: boolean;
}

export interface AppointmentData {
  id: string;
  tenantId: string;
  clientName: string;
  clientPhone: string;
  vehicleInfo: string;
  description: string;
  date: Date;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  cancelReason: string | null;
  notes: string | null;
  createdAt: Date;
}

export interface IAppointmentRepository {
  getConfig(tenantId: string): Promise<ScheduleConfigData | null>;
  upsertConfig(tenantId: string, data: Partial<Omit<ScheduleConfigData, "id" | "tenantId">>): Promise<ScheduleConfigData>;
  createAppointment(data: Omit<AppointmentData, "id" | "createdAt">): Promise<AppointmentData>;
  findByDateRange(tenantId: string, start: Date, end: Date): Promise<AppointmentData[]>;
  findAll(tenantId: string): Promise<AppointmentData[]>;
  findById(id: string): Promise<AppointmentData | null>;
  updateStatus(id: string, status: AppointmentData["status"], cancelReason?: string): Promise<AppointmentData>;
  updateNotes(id: string, notes: string): Promise<AppointmentData>;
  countBySlot(tenantId: string, date: Date): Promise<number>;
}
