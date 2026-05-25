import { GetClientHistory } from "@/application/use-cases/clients/GetClientHistory";
import { IClientRepository, ClientData } from "@/domain/repositories/IClientRepository";
import { IServiceOrderRepository, OrderSummary } from "@/domain/repositories/IServiceOrderRepository";
import { NotFoundError } from "@/domain/errors/DomainError";

const makeClient = (): ClientData => ({
  id: "client-1",
  name: "João Silva",
  document: "123.456.789-00",
  docType: "CPF",
  phone: null,
  email: null,
  address: null,
  active: true,
  tenantId: "tenant-1",
});

const makeOrderSummaries = (): OrderSummary[] => [
  {
    id: "order-1",
    number: 1,
    status: "COMPLETED",
    totalAmount: 350.0,
    createdAt: new Date("2024-01-01"),
    vehicle: { plate: "ABC-1234" },
  },
  {
    id: "order-2",
    number: 2,
    status: "OPEN",
    totalAmount: 150.0,
    createdAt: new Date("2024-02-01"),
    vehicle: { plate: "XYZ-5678" },
  },
];

const makeClientRepo = (client: ClientData | null): IClientRepository => ({
  findById: jest.fn().mockResolvedValue(client),
  findByDocument: jest.fn(),
  search: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  deactivate: jest.fn(),
});

const makeOrderRepo = (orders: OrderSummary[] = []): IServiceOrderRepository => ({
  findById: jest.fn(),
  findAll: jest.fn(),
  findActive: jest.fn(),
  getNextNumber: jest.fn(),
  createWithComplaints: jest.fn(),
  createLegacy: jest.fn(),
  updateStatus: jest.fn(),
  findByClientId: jest.fn().mockResolvedValue(orders),
  findByVehicleId: jest.fn(),
  findOilChangeOrders: jest.fn(),
  cancel: jest.fn(),
  replaceComplaints: jest.fn(),
});

describe("GetClientHistory", () => {
  it("deve retornar lista de OS do cliente", async () => {
    const orders = makeOrderSummaries();
    const clientRepo = makeClientRepo(makeClient());
    const orderRepo = makeOrderRepo(orders);
    const useCase = new GetClientHistory(clientRepo, orderRepo);

    const result = await useCase.execute("client-1", "tenant-1");

    expect(result).toHaveLength(2);
    expect(result[0].number).toBe(1);
    expect(orderRepo.findByClientId).toHaveBeenCalledWith("client-1", "tenant-1");
  });

  it("deve retornar array vazio quando cliente não tem OS", async () => {
    const clientRepo = makeClientRepo(makeClient());
    const orderRepo = makeOrderRepo([]);
    const useCase = new GetClientHistory(clientRepo, orderRepo);

    const result = await useCase.execute("client-1", "tenant-1");

    expect(result).toEqual([]);
  });

  it("deve lançar NotFoundError quando cliente não existe", async () => {
    const clientRepo = makeClientRepo(null);
    const orderRepo = makeOrderRepo();
    const useCase = new GetClientHistory(clientRepo, orderRepo);

    await expect(useCase.execute("inexistente", "tenant-1")).rejects.toThrow(NotFoundError);
    await expect(useCase.execute("inexistente", "tenant-1")).rejects.toThrow("Cliente não encontrado");
  });
});
