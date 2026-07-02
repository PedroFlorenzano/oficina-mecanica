import { CreateAppointment } from "@/application/use-cases/appointments/CreateAppointment";
import { IAppointmentRepository, ScheduleConfigData } from "@/domain/repositories/IAppointmentRepository";
import { ValidationError, BusinessRuleError } from "@/domain/errors/DomainError";

const makeConfig = (overrides: Partial<ScheduleConfigData> = {}): ScheduleConfigData => ({
  id: "config-1",
  tenantId: "tenant-1",
  slotDuration: 60,
  maxPerSlot: 2,
  workDays: "[1,2,3,4,5]",
  startTime: "08:00",
  endTime: "18:00",
  lunchStart: "12:00",
  lunchEnd: "13:00",
  enabled: true,
  ...overrides,
});

const makeRepo = (config: ScheduleConfigData | null = makeConfig(), slotCount = 0): IAppointmentRepository => ({
  getConfig: jest.fn().mockResolvedValue(config),
  upsertConfig: jest.fn(),
  createAppointment: jest.fn().mockImplementation((data) => Promise.resolve({ id: "appt-1", createdAt: new Date(), ...data })),
  findByDateRange: jest.fn().mockResolvedValue([]),
  findAll: jest.fn().mockResolvedValue([]),
  findById: jest.fn().mockResolvedValue(null),
  updateStatus: jest.fn(),
  updateNotes: jest.fn(),
  countBySlot: jest.fn().mockResolvedValue(slotCount),
});

const futureDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  // Ensure it's a weekday (Mon-Fri)
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  return d.toISOString();
};

const validInput = () => ({
  clientName: "João Silva",
  clientPhone: "(15) 99999-0000",
  vehicleInfo: "Fiat Uno 2020 - ABC1D23",
  description: "Troca de óleo",
  date: futureDate(),
});

describe("CreateAppointment", () => {
  it("deve criar agendamento com dados válidos", async () => {
    const repo = makeRepo();
    const useCase = new CreateAppointment(repo);

    const result = await useCase.execute(validInput(), "tenant-1");

    expect(result.id).toBe("appt-1");
    expect(result.clientName).toBe("João Silva");
    expect(result.status).toBe("PENDING");
    expect(repo.createAppointment).toHaveBeenCalled();
  });

  it("deve lançar ValidationError se clientName vazio", async () => {
    const repo = makeRepo();
    const useCase = new CreateAppointment(repo);

    await expect(
      useCase.execute({ ...validInput(), clientName: "" }, "tenant-1")
    ).rejects.toThrow(ValidationError);
  });

  it("deve lançar ValidationError se clientPhone vazio", async () => {
    const repo = makeRepo();
    const useCase = new CreateAppointment(repo);

    await expect(
      useCase.execute({ ...validInput(), clientPhone: "  " }, "tenant-1")
    ).rejects.toThrow(ValidationError);
  });

  it("deve lançar ValidationError se vehicleInfo vazio", async () => {
    const repo = makeRepo();
    const useCase = new CreateAppointment(repo);

    await expect(
      useCase.execute({ ...validInput(), vehicleInfo: "" }, "tenant-1")
    ).rejects.toThrow(ValidationError);
  });

  it("deve lançar ValidationError se description vazia", async () => {
    const repo = makeRepo();
    const useCase = new CreateAppointment(repo);

    await expect(
      useCase.execute({ ...validInput(), description: "" }, "tenant-1")
    ).rejects.toThrow(ValidationError);
  });

  it("deve lançar ValidationError se data no passado", async () => {
    const repo = makeRepo();
    const useCase = new CreateAppointment(repo);

    await expect(
      useCase.execute({ ...validInput(), date: "2020-01-01T10:00:00Z" }, "tenant-1")
    ).rejects.toThrow(ValidationError);
  });

  it("deve lançar ValidationError se data inválida", async () => {
    const repo = makeRepo();
    const useCase = new CreateAppointment(repo);

    await expect(
      useCase.execute({ ...validInput(), date: "invalid-date" }, "tenant-1")
    ).rejects.toThrow(ValidationError);
  });

  it("deve lançar BusinessRuleError se agendamento não habilitado", async () => {
    const repo = makeRepo(makeConfig({ enabled: false }));
    const useCase = new CreateAppointment(repo);

    await expect(
      useCase.execute(validInput(), "tenant-1")
    ).rejects.toThrow(BusinessRuleError);
  });

  it("deve lançar BusinessRuleError se config é null", async () => {
    const repo = makeRepo(null);
    const useCase = new CreateAppointment(repo);

    await expect(
      useCase.execute(validInput(), "tenant-1")
    ).rejects.toThrow(BusinessRuleError);
  });

  it("deve lançar BusinessRuleError se horário lotado", async () => {
    const repo = makeRepo(makeConfig({ maxPerSlot: 2 }), 2);
    const useCase = new CreateAppointment(repo);

    await expect(
      useCase.execute(validInput(), "tenant-1")
    ).rejects.toThrow(BusinessRuleError);
  });

  it("deve fazer trim nos campos de texto", async () => {
    const repo = makeRepo();
    const useCase = new CreateAppointment(repo);

    await useCase.execute({
      ...validInput(),
      clientName: "  João Silva  ",
      clientPhone: " (15) 99999-0000 ",
      vehicleInfo: "  Fiat Uno  ",
      description: "  Troca de óleo  ",
    }, "tenant-1");

    expect(repo.createAppointment).toHaveBeenCalledWith(
      expect.objectContaining({
        clientName: "João Silva",
        clientPhone: "(15) 99999-0000",
        vehicleInfo: "Fiat Uno",
        description: "Troca de óleo",
      })
    );
  });
});
