import { PrismaClient } from "@prisma/client";
import {
  IAppointmentRepository,
  ScheduleConfigData,
  AppointmentData,
} from "@/domain/repositories/IAppointmentRepository";

export class PrismaAppointmentRepository implements IAppointmentRepository {
  constructor(private readonly db: PrismaClient) {}

  async getConfig(tenantId: string): Promise<ScheduleConfigData | null> {
    return this.db.scheduleConfig.findUnique({ where: { tenantId } }) as unknown as ScheduleConfigData | null;
  }

  async upsertConfig(tenantId: string, data: Partial<Omit<ScheduleConfigData, "id" | "tenantId">>): Promise<ScheduleConfigData> {
    return this.db.scheduleConfig.upsert({
      where: { tenantId },
      update: data,
      create: { tenantId, ...data },
    }) as unknown as ScheduleConfigData;
  }

  async createAppointment(data: Omit<AppointmentData, "id" | "createdAt">): Promise<AppointmentData> {
    return this.db.appointment.create({ data }) as unknown as AppointmentData;
  }

  async findByDateRange(tenantId: string, start: Date, end: Date): Promise<AppointmentData[]> {
    return this.db.appointment.findMany({
      where: { tenantId, date: { gte: start, lte: end }, status: { not: "CANCELLED" } },
      orderBy: { date: "asc" },
    }) as unknown as AppointmentData[];
  }

  async findAll(tenantId: string): Promise<AppointmentData[]> {
    return this.db.appointment.findMany({
      where: { tenantId },
      orderBy: { date: "desc" },
    }) as unknown as AppointmentData[];
  }

  async findById(id: string): Promise<AppointmentData | null> {
    return this.db.appointment.findUnique({ where: { id } }) as unknown as AppointmentData | null;
  }

  async updateStatus(id: string, status: AppointmentData["status"], cancelReason?: string): Promise<AppointmentData> {
    return this.db.appointment.update({
      where: { id },
      data: { status, cancelReason: cancelReason || null },
    }) as unknown as AppointmentData;
  }

  async updateNotes(id: string, notes: string): Promise<AppointmentData> {
    return this.db.appointment.update({ where: { id }, data: { notes } }) as unknown as AppointmentData;
  }

  async countBySlot(tenantId: string, date: Date): Promise<number> {
    return this.db.appointment.count({
      where: { tenantId, date, status: { not: "CANCELLED" } },
    });
  }
}
