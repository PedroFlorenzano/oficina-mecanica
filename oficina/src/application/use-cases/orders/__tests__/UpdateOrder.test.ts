import { UpdateOrder } from "@/application/use-cases/orders/UpdateOrder";
import { IServiceOrderRepository } from "@/domain/repositories/IServiceOrderRepository";
import { IStockItemRepository, StockItemData } from "@/domain/repositories/IStockItemRepository";
import { IStockMovementRepository, StockMovementData } from "@/domain/repositories/IStockMovementRepository";

const makeOrder = (status = "WAITING_APPROVAL") => ({
  id: "order-1",
  number: 1,
  status,
  tenantId: "tenant-1",
  totalAmount: 500,
  notes: null,
  complaints: [
    {
      id: "c1",
      services: [{ id: "s1", description: "Troca óleo", price: 60 }],
      parts: [{ id: "p1", description: "Filtro", quantity: 1, unitPrice: 40, stockItemId: "stock-1" }],
    },
  ],
  parts: [{ id: "p1", stockItemId: "stock-1", quantity: 1 }],
});

const makeStockItem = (id: string, quantity = 10): StockItemData => ({
  id, code: "P001", barcode: null, description: "Item", brand: null, unit: "UN",
  minQuantity: 0, quantity, location: null, supplier: null,
  costPrice: 10, sellPrice: 20, avgCost: 10, profitMargin: 1, active: true, tenantId: "tenant-1",
});

const makeOrderRepo = (order = makeOrder()): IServiceOrderRepository => ({
  findById: jest.fn().mockResolvedValue(order),
  findAll: jest.fn(),
  findActive: jest.fn(),
  getNextNumber: jest.fn(),
  createWithComplaints: jest.fn(),
  createLegacy: jest.fn(),
  updateStatus: jest.fn(),
  replaceComplaints: jest.fn().mockResolvedValue({ ...order, totalAmount: 0 }),
  findByClientId: jest.fn(),
  findByVehicleId: jest.fn(),
  findOilChangeOrders: jest.fn(),
  cancel: jest.fn(),
});

const makeStockItemRepo = (items: StockItemData[] = [makeStockItem("stock-1")]): IStockItemRepository => ({
  findById: jest.fn().mockImplementation((id) => Promise.resolve(items.find((i) => i.id === id) ?? null)),
  findByCode: jest.fn(),
  findAll: jest.fn(),
  findLowStock: jest.fn(),
  count: jest.fn(),
  create: jest.fn(),
  update: jest.fn().mockImplementation((id, data) => {
    const item = items.find((i) => i.id === id);
    return Promise.resolve({ ...item, ...data } as StockItemData);
  }),
  delete: jest.fn(),
  countMovements: jest.fn(),
  countOrderParts: jest.fn(),
  createEntryTransaction: jest.fn(),
});

const makeMovementRepo = (reservations: StockMovementData[] = []): IStockMovementRepository => ({
  create: jest.fn().mockResolvedValue({} as StockMovementData),
  findPendingReservations: jest.fn().mockResolvedValue(reservations),
  findByOrderId: jest.fn(),
  findByStockItemId: jest.fn(),
});

describe("UpdateOrder", () => {
  const validInput = {
    complaints: [
      {
        description: "Troca de óleo",
        services: [{ description: "Mão de obra", price: 80 }],
        parts: [{ description: "Óleo 5W30", quantity: 4, unitPrice: 32, stockItemId: "stock-1" }],
      },
    ],
  };

  it("deve rejeitar edição se OS não está em WAITING_APPROVAL", async () => {
    const orderRepo = makeOrderRepo(makeOrder("IN_PROGRESS"));
    const useCase = new UpdateOrder(orderRepo, makeStockItemRepo(), makeMovementRepo());

    await expect(useCase.execute("order-1", validInput, "tenant-1")).rejects.toThrow(
      "Somente OS em status 'Aguardando Aprovação' pode ser editada"
    );
  });

  it("deve rejeitar se OS não pertence ao tenant", async () => {
    const orderRepo = makeOrderRepo();
    const useCase = new UpdateOrder(orderRepo, makeStockItemRepo(), makeMovementRepo());

    await expect(useCase.execute("order-1", validInput, "outro-tenant")).rejects.toThrow();
  });

  it("deve rejeitar se não tem reclamações", async () => {
    const orderRepo = makeOrderRepo();
    const useCase = new UpdateOrder(orderRepo, makeStockItemRepo(), makeMovementRepo());

    await expect(
      useCase.execute("order-1", { complaints: [] }, "tenant-1")
    ).rejects.toThrow("A OS deve ter ao menos uma reclamação");
  });

  it("deve rejeitar se não tem serviço com preço", async () => {
    const orderRepo = makeOrderRepo();
    const useCase = new UpdateOrder(orderRepo, makeStockItemRepo(), makeMovementRepo());

    await expect(
      useCase.execute("order-1", {
        complaints: [{ description: "Teste", services: [], parts: [] }],
      }, "tenant-1")
    ).rejects.toThrow("A OS deve ter ao menos um serviço com preço");
  });

  it("deve rejeitar peça com quantidade <= 0", async () => {
    const orderRepo = makeOrderRepo();
    const useCase = new UpdateOrder(orderRepo, makeStockItemRepo(), makeMovementRepo());

    await expect(
      useCase.execute("order-1", {
        complaints: [{
          description: "Teste",
          services: [{ description: "Svc", price: 100 }],
          parts: [{ description: "Peça", quantity: 0, unitPrice: 10 }],
        }],
      }, "tenant-1")
    ).rejects.toThrow("Quantidade inválida");
  });

  it("deve recalcular totalAmount corretamente", async () => {
    const orderRepo = makeOrderRepo();
    const useCase = new UpdateOrder(orderRepo, makeStockItemRepo(), makeMovementRepo());

    await useCase.execute("order-1", validInput, "tenant-1");

    // serviços = 80, peças = 4×32 = 128, total = 208
    expect(orderRepo.replaceComplaints).toHaveBeenCalledWith(
      "order-1", "tenant-1", expect.anything(), 208, null
    );
  });

  it("deve reverter reservas de estoque antes de substituir", async () => {
    const reservation: StockMovementData = {
      id: "mov-1", type: "RESERVED", quantity: 1, reason: "Reserva",
      document: null, supplier: null, unitCost: 10, orderId: "order-1",
      balanceBefore: 10, balanceAfter: 9, stockItemId: "stock-1", createdAt: new Date(),
    };
    const movementRepo = makeMovementRepo([reservation]);
    const stockItemRepo = makeStockItemRepo();
    const orderRepo = makeOrderRepo();
    const useCase = new UpdateOrder(orderRepo, stockItemRepo, movementRepo);

    await useCase.execute("order-1", validInput, "tenant-1");

    // Deve ter chamado findPendingReservations para reverter
    expect(movementRepo.findPendingReservations).toHaveBeenCalledWith("order-1");
    // Deve ter criado movimentação de REVERSAL
    expect(movementRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: "REVERSAL", stockItemId: "stock-1" })
    );
  });

  it("deve reservar estoque para novas peças com stockItemId", async () => {
    const movementRepo = makeMovementRepo([]);
    const stockItemRepo = makeStockItemRepo();
    const orderRepo = makeOrderRepo();
    const useCase = new UpdateOrder(orderRepo, stockItemRepo, movementRepo);

    await useCase.execute("order-1", validInput, "tenant-1");

    // Deve ter criado movimentação de RESERVED para a nova peça
    expect(movementRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: "RESERVED", quantity: 4, stockItemId: "stock-1" })
    );
  });

  it("deve retornar stockWarnings se reserva falhar (saldo insuficiente)", async () => {
    const movementRepo = makeMovementRepo([]);
    const stockItemRepo = makeStockItemRepo([makeStockItem("stock-1", 2)]); // só 2 em estoque
    const orderRepo = makeOrderRepo();
    const useCase = new UpdateOrder(orderRepo, stockItemRepo, movementRepo);

    const result = await useCase.execute("order-1", validInput, "tenant-1");

    // Peça pede 4, estoque tem 2 → warning
    expect(result.stockWarnings).toBeDefined();
    expect(result.stockWarnings![0]).toContain("Saldo insuficiente");
  });

  it("não deve afetar comissões (OS em WAITING_APPROVAL não tem comissão)", async () => {
    // Comissões só são geradas para OS COMPLETED/DELIVERED
    // Este teste garante que a edição não toca em comissões
    const orderRepo = makeOrderRepo();
    const useCase = new UpdateOrder(orderRepo, makeStockItemRepo(), makeMovementRepo());

    await useCase.execute("order-1", validInput, "tenant-1");

    // Nenhuma interação com comissões — apenas replaceComplaints
    expect(orderRepo.replaceComplaints).toHaveBeenCalledTimes(1);
  });
});
