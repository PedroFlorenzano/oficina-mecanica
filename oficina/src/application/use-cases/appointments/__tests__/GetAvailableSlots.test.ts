import { GetAvailableSlots } from "@/application/use-cases/appointments/GetAvailableSlots";
import { IAppointmentRepository, ScheduleConfigData, AppointmentData } from "@/domain/repositories/IAppointmentRepository";

const makeConfig = (overrides: Partial<ScheduleConfigData> = {}): ScheduleConfigData => ({
  id: "config-1",
  tenantId: "tenant-1",
  slotDuration: 60,
  maxPerSlot: 2,
  workDays: "[1,2,3,4,5]", // Mon-Fri
  startTime: "08:00",
  endTime: "12:00",
  lunchStart: null,
  lunchEnd: null,
  enabled: true,
  ...overrides,
});

const makeRepo = (config: ScheduleConfigData | null = makeConfig(), appointments: AppointmentData[] = []): IAppointmentRepository => ({
  getConfig: jest.fn().mockResolvedValue(config),
  upsertConfig: jest.fn(),
  createAppointment: jest.fn(),
  findByDateRange: jest.fn().mockResolvedValue(appointments),
  findAll: jest.fn().mockResolvedValue([]),
  findById: jest.fn().mockResolvedValue(null),
  updateStatus: jest.fn(),
  updateNotes: jest.fn(),
  countBySlot: jest.fn().mockResolvedValue(0),
});

describe("GetAvailableSlots", () => {
  it("deve retornar slots disponíveis para dia útil", async () => {
    const repo = makeRepo();
    const useCase = new GetAvailableSlots(repo);

    // 2026-07-06 is a Monday
    const slots = await useCase.execute("tenant-1", "2026-07-06");

    expect(slots.length).toBe(4); // 08:00, 09:00, 10:00, 11:00
    expect(slots[0]).toEqual({ time: "08:00", available: true });
    expect(slots[3]).toEqual({ time: "11:00", available: true });
  });

  it("deve retornar lista vazia se config desabilitada", async () => {
    const repo = makeRepo(makeConfig({ enabled: false }));
    const useCase = new GetAvailableSlots(repo);

    const slots = await useCase.execute("tenant-1", "2026-07-06");
    expect(slots).toEqual([]);
  });

  it("deve retornar lista vazia se config é null", async () => {
    const repo = makeRepo(null);
    const useCase = new GetAvailableSlots(repo);

    const slots = await useCase.execute("tenant-1", "2026-07-06");
    expect(slots).toEqual([]);
  });

  it("deve retornar lista vazia para fim de semana", async () => {
    const repo = makeRepo(); // workDays: Mon-Fri
    const useCase = new GetAvailableSlots(repo);

    // 2026-07-05 is a Sunday
    const slots = await useCase.execute("tenant-1", "2026-07-05");
    expect(slots).toEqual([]);
  });

  it("deve pular horário de almoço", async () => {
    const repo = makeRepo(makeConfig({
      startTime: "08:00",
      endTime: "14:00",
      lunchStart: "12:00",
      lunchEnd: "13:00",
      slotDuration: 60,
    }));
    const useCase = new GetAvailableSlots(repo);

    const slots = await useCase.execute("tenant-1", "2026-07-06");
    const times = slots.map(s => s.time);

    expect(times).toContain("08:00");
    expect(times).toContain("11:00");
    expect(times).not.toContain("12:00"); // lunch
    expect(times).toContain("13:00");
  });

  it("deve marcar slot como indisponível quando lotado", async () => {
    const appointments: AppointmentData[] = [
      { id: "a1", tenantId: "tenant-1", clientName: "A", clientPhone: "1", vehicleInfo: "v", description: "d", date: new Date("2026-07-06T08:00:00"), status: "PENDING", cancelReason: null, notes: null, createdAt: new Date() },
      { id: "a2", tenantId: "tenant-1", clientName: "B", clientPhone: "2", vehicleInfo: "v", description: "d", date: new Date("2026-07-06T08:00:00"), status: "PENDING", cancelReason: null, notes: null, createdAt: new Date() },
    ];
    const repo = makeRepo(makeConfig({ maxPerSlot: 2 }), appointments);
    const useCase = new GetAvailableSlots(repo);

    const slots = await useCase.execute("tenant-1", "2026-07-06");

    const slot8 = slots.find(s => s.time === "08:00");
    expect(slot8?.available).toBe(false);
  });

  it("deve respeitar slotDuration de 30 minutos", async () => {
    const repo = makeRepo(makeConfig({
      startTime: "08:00",
      endTime: "10:00",
      slotDuration: 30,
    }));
    const useCase = new GetAvailableSlots(repo);

    const slots = await useCase.execute("tenant-1", "2026-07-06");
    const times = slots.map(s => s.time);

    expect(times).toEqual(["08:00", "08:30", "09:00", "09:30"]);
  });
});
