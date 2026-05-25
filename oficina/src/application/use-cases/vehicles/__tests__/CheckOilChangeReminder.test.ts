import { CheckOilChangeReminder } from "@/application/use-cases/vehicles/CheckOilChangeReminder";
import { IVehicleRepository, VehicleData } from "@/domain/repositories/IVehicleRepository";
import { IServiceOrderRepository } from "@/domain/repositories/IServiceOrderRepository";
import { NotFoundError } from "@/domain/errors/DomainError";

const makeVehicle = (mileage: number): VehicleData => ({
  id: "vehicle-1",
  plate: "ABC-1234",
  brand: "Chevrolet",
  model: "Onix",
  year: 2020,
  yearModel: null,
  color: "Prata",
  fuel: "Flex",
  chassis: null,
  mileage,
  clientId: "client-1",
  tenantId: "tenant-1",
});

const makeVehicleRepo = (vehicle: VehicleData | null): IVehicleRepository => ({
  findById: jest.fn().mockResolvedValue(vehicle),
  findByPlate: jest.fn(),
  findByPlateExcluding: jest.fn(),
  search: jest.fn(),
  findAll: jest.fn(),
  findWithReminderEnabled: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  updateMileage: jest.fn(),
  delete: jest.fn(),
  countOrders: jest.fn(),
});

const makeOrderRepo = (oilOrders: { mileage: number; createdAt: Date }[]): IServiceOrderRepository => ({
  findById: jest.fn(),
  findAll: jest.fn(),
  findActive: jest.fn(),
  getNextNumber: jest.fn(),
  createWithComplaints: jest.fn(),
  createLegacy: jest.fn(),
  updateStatus: jest.fn(),
  findByClientId: jest.fn(),
  findByVehicleId: jest.fn(),
  findOilChangeOrders: jest.fn().mockResolvedValue(oilOrders),
  cancel: jest.fn(),
});

describe("CheckOilChangeReminder", () => {
  const LAST_CHANGE_MILEAGE = 40000;
  const lastOilOrder = [{ mileage: LAST_CHANGE_MILEAGE, createdAt: new Date("2024-01-01") }];

  it("deve retornar null quando não há OS de troca de óleo", async () => {
    const vehicleRepo = makeVehicleRepo(makeVehicle(45000));
    const orderRepo = makeOrderRepo([]);
    const useCase = new CheckOilChangeReminder(vehicleRepo, orderRepo);

    const result = await useCase.execute("vehicle-1", "tenant-1");

    expect(result).toBeNull();
  });

  it("deve retornar null quando km atual é menor que lastChange + 4000", async () => {
    // 40000 + 4000 = 44000, km atual: 43000 — abaixo do limiar
    const vehicleRepo = makeVehicleRepo(makeVehicle(43000));
    const orderRepo = makeOrderRepo(lastOilOrder);
    const useCase = new CheckOilChangeReminder(vehicleRepo, orderRepo);

    const result = await useCase.execute("vehicle-1", "tenant-1");

    expect(result).toBeNull();
  });

  it("deve retornar alerta com overdue=false entre 4000 e 4999 km após troca", async () => {
    // 40000 + 4000 = 44000 (início do alerta), 40000 + 5000 = 45000 (limite), km: 44500
    const vehicleRepo = makeVehicleRepo(makeVehicle(44500));
    const orderRepo = makeOrderRepo(lastOilOrder);
    const useCase = new CheckOilChangeReminder(vehicleRepo, orderRepo);

    const result = await useCase.execute("vehicle-1", "tenant-1");

    expect(result).not.toBeNull();
    expect(result!.overdue).toBe(false);
    expect(result!.dueAt).toBe(45000);
    expect(result!.lastChangeMileage).toBe(40000);
    expect(result!.currentMileage).toBe(44500);
  });

  it("deve retornar alerta com overdue=true a partir de 5000 km após troca", async () => {
    // km atual: 46000 >= 40000 + 5000 = 45000
    const vehicleRepo = makeVehicleRepo(makeVehicle(46000));
    const orderRepo = makeOrderRepo(lastOilOrder);
    const useCase = new CheckOilChangeReminder(vehicleRepo, orderRepo);

    const result = await useCase.execute("vehicle-1", "tenant-1");

    expect(result).not.toBeNull();
    expect(result!.overdue).toBe(true);
    expect(result!.dueAt).toBe(45000);
  });

  it("deve retornar alerta com overdue=false exatamente em lastChange + 4000", async () => {
    const vehicleRepo = makeVehicleRepo(makeVehicle(44000));
    const orderRepo = makeOrderRepo(lastOilOrder);
    const useCase = new CheckOilChangeReminder(vehicleRepo, orderRepo);

    const result = await useCase.execute("vehicle-1", "tenant-1");

    expect(result).not.toBeNull();
    expect(result!.overdue).toBe(false);
  });

  it("deve retornar alerta com overdue=true exatamente em lastChange + 5000", async () => {
    const vehicleRepo = makeVehicleRepo(makeVehicle(45000));
    const orderRepo = makeOrderRepo(lastOilOrder);
    const useCase = new CheckOilChangeReminder(vehicleRepo, orderRepo);

    const result = await useCase.execute("vehicle-1", "tenant-1");

    expect(result).not.toBeNull();
    expect(result!.overdue).toBe(true);
  });

  it("deve lançar NotFoundError quando veículo não existe", async () => {
    const vehicleRepo = makeVehicleRepo(null);
    const orderRepo = makeOrderRepo([]);
    const useCase = new CheckOilChangeReminder(vehicleRepo, orderRepo);

    await expect(useCase.execute("inexistente", "tenant-1")).rejects.toThrow(NotFoundError);
  });

  it("deve usar a OS mais recente quando há múltiplas trocas", async () => {
    const multipleOrders = [
      { mileage: 30000, createdAt: new Date("2023-01-01") },
      { mileage: 40000, createdAt: new Date("2024-01-01") }, // mais recente
    ];
    const vehicleRepo = makeVehicleRepo(makeVehicle(46000));
    const orderRepo = makeOrderRepo(multipleOrders);
    const useCase = new CheckOilChangeReminder(vehicleRepo, orderRepo);

    const result = await useCase.execute("vehicle-1", "tenant-1");

    expect(result!.lastChangeMileage).toBe(40000); // deve usar a mais recente
    expect(result!.dueAt).toBe(45000);
  });
});
