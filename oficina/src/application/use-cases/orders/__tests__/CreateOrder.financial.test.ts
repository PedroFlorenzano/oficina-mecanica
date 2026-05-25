import { CreateOrder } from "@/application/use-cases/orders/CreateOrder";
import { IServiceOrderRepository, CreateOrderData } from "@/domain/repositories/IServiceOrderRepository";
import { IVehicleRepository } from "@/domain/repositories/IVehicleRepository";

const makeOrderRepo = (): IServiceOrderRepository => ({
  findById: jest.fn(),
  findAll: jest.fn(),
  findActive: jest.fn(),
  getNextNumber: jest.fn().mockResolvedValue(1),
  createWithComplaints: jest.fn().mockImplementation((data: CreateOrderData) =>
    Promise.resolve({ id: "order-1", number: 1, totalAmount: data.totalAmount })
  ),
  createLegacy: jest.fn().mockResolvedValue({ id: "order-1", number: 1 }),
  updateStatus: jest.fn(),
  findByClientId: jest.fn(),
  findByVehicleId: jest.fn(),
  findOilChangeOrders: jest.fn(),
  cancel: jest.fn(),
  replaceComplaints: jest.fn(),
});

const makeVehicleRepo = (): IVehicleRepository => ({
  findById: jest.fn(),
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

describe("CreateOrder — cálculo de totalAmount", () => {
  it("deve calcular totalAmount = soma de serviços + (qtd × unitPrice) de peças por reclamação", async () => {
    const orderRepo = makeOrderRepo();
    const vehicleRepo = makeVehicleRepo();
    const useCase = new CreateOrder(orderRepo, vehicleRepo);

    await useCase.execute(
      {
        clientId: "c1",
        vehicleId: "v1",
        mileage: 50000,
        complaints: [
          {
            description: "Barulho na suspensão",
            services: [
              { description: "Troca amortecedor", price: 250.0 },
              { description: "Alinhamento", price: 80.0 },
            ],
            parts: [
              { description: "Amortecedor dianteiro", quantity: 2, unitPrice: 180.0 },
              { description: "Batente", quantity: 2, unitPrice: 35.0 },
            ],
          },
          {
            description: "Troca de óleo",
            services: [{ description: "Troca de óleo", price: 60.0 }],
            parts: [
              { description: "Óleo 5W30", quantity: 4, unitPrice: 32.0 },
              { description: "Filtro de óleo", quantity: 1, unitPrice: 28.0 },
            ],
          },
        ],
      },
      "tenant-1",
      "user-1"
    );

    // Reclamação 1: serviços = 250 + 80 = 330, peças = 2×180 + 2×35 = 430 → subtotal = 760
    // Reclamação 2: serviços = 60, peças = 4×32 + 1×28 = 156 → subtotal = 216
    // Total = 760 + 216 = 976
    expect(orderRepo.createWithComplaints).toHaveBeenCalledWith(
      expect.objectContaining({ totalAmount: 976 })
    );
  });

  it("deve calcular totalAmount = 0 quando serviços e peças têm preço 0", async () => {
    const orderRepo = makeOrderRepo();
    const vehicleRepo = makeVehicleRepo();
    const useCase = new CreateOrder(orderRepo, vehicleRepo);

    await useCase.execute(
      {
        clientId: "c1",
        vehicleId: "v1",
        mileage: 10000,
        complaints: [
          {
            description: "Garantia",
            services: [{ description: "Revisão garantia", price: 0 }],
            parts: [{ description: "Peça garantia", quantity: 1, unitPrice: 0 }],
          },
        ],
      },
      "tenant-1",
      "user-1"
    );

    expect(orderRepo.createWithComplaints).toHaveBeenCalledWith(
      expect.objectContaining({ totalAmount: 0 })
    );
  });

  it("deve calcular totalAmount corretamente com valores decimais (centavos)", async () => {
    const orderRepo = makeOrderRepo();
    const vehicleRepo = makeVehicleRepo();
    const useCase = new CreateOrder(orderRepo, vehicleRepo);

    await useCase.execute(
      {
        clientId: "c1",
        vehicleId: "v1",
        mileage: 30000,
        complaints: [
          {
            description: "Revisão",
            services: [{ description: "Mão de obra", price: 99.99 }],
            parts: [
              { description: "Filtro ar", quantity: 1, unitPrice: 45.50 },
              { description: "Vela ignição", quantity: 4, unitPrice: 22.75 },
            ],
          },
        ],
      },
      "tenant-1",
      "user-1"
    );

    // serviços = 99.99, peças = 1×45.50 + 4×22.75 = 45.50 + 91.00 = 136.50
    // total = 99.99 + 136.50 = 236.49
    expect(orderRepo.createWithComplaints).toHaveBeenCalledWith(
      expect.objectContaining({ totalAmount: 236.49 })
    );
  });

  it("deve calcular totalAmount com múltiplas reclamações sem peças", async () => {
    const orderRepo = makeOrderRepo();
    const vehicleRepo = makeVehicleRepo();
    const useCase = new CreateOrder(orderRepo, vehicleRepo);

    await useCase.execute(
      {
        clientId: "c1",
        vehicleId: "v1",
        mileage: 20000,
        complaints: [
          {
            description: "Diagnóstico",
            services: [{ description: "Diagnóstico eletrônico", price: 150.0 }],
            parts: [],
          },
          {
            description: "Regulagem",
            services: [{ description: "Regulagem de válvulas", price: 200.0 }],
            parts: [],
          },
        ],
      },
      "tenant-1",
      "user-1"
    );

    expect(orderRepo.createWithComplaints).toHaveBeenCalledWith(
      expect.objectContaining({ totalAmount: 350 })
    );
  });
});
