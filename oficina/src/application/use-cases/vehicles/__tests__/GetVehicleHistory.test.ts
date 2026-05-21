import { GetVehicleHistory } from "@/application/use-cases/vehicles/GetVehicleHistory";
import { IVehicleRepository, VehicleData } from "@/domain/repositories/IVehicleRepository";
import { IServiceOrderRepository, OrderSummary } from "@/domain/repositories/IServiceOrderRepository";
import { NotFoundError } from "@/domain/errors/DomainError";

const makeVehicle = (overrides: Partial<VehicleData> = {}): VehicleData => ({
  id: "vehicle-1",
  plate: "ABC-1234",
  brand: "Chevrolet",
  model: "Onix",
  year: 2020,
  yearModel: null,
  color: "Prata",
  fuel: "Flex",
  chassis: null,
  mileage: 45000,
  clientId: "client-1",
  tenantId: "tenant-1",
  ...overrides,
});

const makeOrderSummaries = (): OrderSummary[] => [
  {
    id: "order-1",
    number: 1,
    status: "COMPLETED",
    totalAmount: 800.0,
    createdAt: new Date("2024-01-01"),
    client: { name: "João Silva" },
  },
];

const makeVehicleRepo = (vehicle: VehicleData | null): IVehicleRepository => ({
  findById: jest.fn().mockResolvedValue(vehicle),
  findByPlate: jest.fn(),
  findByPlateExcluding: jest.fn(),
  search: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  updateMileage: jest.fn(),
  delete: jest.fn(),
  countOrders: jest.fn(),
});

const makeOrderRepo = (orders: OrderSummary[] = []): IServiceOrderRepository => ({
  findById: jest.fn(),
  findAll: jest.fn(),
  findActive: jest.fn(),
  getNextNumber: jest.fn(),
  createWithComplaints: jest.fn(),
  createLegacy: jest.fn(),
  updateStatus: jest.fn(),
  findByClientId: jest.fn(),
  findByVehicleId: jest.fn().mockResolvedValue(orders),
  findOilChangeOrders: jest.fn(),
  cancel: jest.fn(),
});

describe("GetVehicleHistory", () => {
  it("deve retornar lista de OS do veículo", async () => {
    const orders = makeOrderSummaries();
    const vehicleRepo = makeVehicleRepo(makeVehicle());
    const orderRepo = makeOrderRepo(orders);
    const useCase = new GetVehicleHistory(vehicleRepo, orderRepo);

    const result = await useCase.execute("vehicle-1", "tenant-1");

    expect(result).toHaveLength(1);
    expect(result[0].client?.name).toBe("João Silva");
    expect(orderRepo.findByVehicleId).toHaveBeenCalledWith("vehicle-1", "tenant-1");
  });

  it("deve retornar array vazio quando veículo não tem OS", async () => {
    const vehicleRepo = makeVehicleRepo(makeVehicle());
    const orderRepo = makeOrderRepo([]);
    const useCase = new GetVehicleHistory(vehicleRepo, orderRepo);

    const result = await useCase.execute("vehicle-1", "tenant-1");

    expect(result).toEqual([]);
  });

  it("deve lançar NotFoundError quando veículo não existe", async () => {
    const vehicleRepo = makeVehicleRepo(null);
    const orderRepo = makeOrderRepo();
    const useCase = new GetVehicleHistory(vehicleRepo, orderRepo);

    await expect(useCase.execute("inexistente", "tenant-1")).rejects.toThrow(NotFoundError);
    await expect(useCase.execute("inexistente", "tenant-1")).rejects.toThrow("Veículo não encontrado");
  });

  it("deve lançar NotFoundError quando tenantId não corresponde", async () => {
    const vehicleRepo = makeVehicleRepo(makeVehicle({ tenantId: "outro-tenant" }));
    const orderRepo = makeOrderRepo();
    const useCase = new GetVehicleHistory(vehicleRepo, orderRepo);

    await expect(useCase.execute("vehicle-1", "tenant-1")).rejects.toThrow(NotFoundError);
  });
});
