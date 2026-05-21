import { ReverseStockReservations } from "@/application/use-cases/stock/ReverseStockReservations";
import { IStockItemRepository, StockItemData } from "@/domain/repositories/IStockItemRepository";
import { IStockMovementRepository, StockMovementData } from "@/domain/repositories/IStockMovementRepository";

const makeItem = (id: string, quantity: number): StockItemData => ({
  id,
  code: `P${id}`,
  barcode: null,
  description: `Item ${id}`,
  brand: null,
  unit: "UN",
  minQuantity: 0,
  quantity,
  location: null,
  costPrice: 10.0,
  sellPrice: 20.0,
  avgCost: 10.0,
  profitMargin: 1.0,
  active: true,
  tenantId: "tenant-1",
});

const makeReservation = (stockItemId: string, quantity: number): StockMovementData => ({
  id: `mov-${stockItemId}`,
  type: "RESERVED",
  quantity,
  reason: "Reserva para OS order-1",
  document: null,
  orderId: "order-1",
  balanceBefore: quantity + 5,
  balanceAfter: 5,
  stockItemId,
  createdAt: new Date(),
});

const makeStockItemRepo = (items: StockItemData[]): IStockItemRepository => ({
  findById: jest.fn().mockImplementation((id: string) =>
    Promise.resolve(items.find((i) => i.id === id) ?? null)
  ),
  findByCode: jest.fn(),
  findAll: jest.fn(),
  count: jest.fn(),
  create: jest.fn(),
  update: jest.fn().mockResolvedValue({} as StockItemData),
  delete: jest.fn(),
  countMovements: jest.fn(),
  countOrderParts: jest.fn(),
});

const makeMovementRepo = (pendingReservations: StockMovementData[]): IStockMovementRepository => ({
  create: jest.fn().mockResolvedValue({} as StockMovementData),
  findPendingReservations: jest.fn().mockResolvedValue(pendingReservations),
  findByOrderId: jest.fn(),
});

describe("ReverseStockReservations", () => {
  it("deve estornar todas as reservas pendentes", async () => {
    const reservations = [
      makeReservation("item-1", 3),
      makeReservation("item-2", 2),
    ];
    const items = [makeItem("item-1", 7), makeItem("item-2", 3)];
    const stockItemRepo = makeStockItemRepo(items);
    const movementRepo = makeMovementRepo(reservations);
    const useCase = new ReverseStockReservations(stockItemRepo, movementRepo);

    await useCase.execute("order-1");

    expect(movementRepo.create).toHaveBeenCalledTimes(2);
    expect(stockItemRepo.update).toHaveBeenCalledTimes(2);
  });

  it("deve criar movimento REVERSAL com balanceBefore e balanceAfter corretos", async () => {
    const reservations = [makeReservation("item-1", 3)];
    const items = [makeItem("item-1", 7)]; // saldo atual após reserva
    const stockItemRepo = makeStockItemRepo(items);
    const movementRepo = makeMovementRepo(reservations);
    const useCase = new ReverseStockReservations(stockItemRepo, movementRepo);

    await useCase.execute("order-1");

    expect(movementRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "REVERSAL",
        quantity: 3,
        balanceBefore: 7,
        balanceAfter: 10, // 7 + 3 = 10
        stockItemId: "item-1",
        orderId: "order-1",
      })
    );
    expect(stockItemRepo.update).toHaveBeenCalledWith("item-1", { quantity: 10 });
  });

  it("deve concluir sem erro quando não há reservas pendentes", async () => {
    const stockItemRepo = makeStockItemRepo([]);
    const movementRepo = makeMovementRepo([]);
    const useCase = new ReverseStockReservations(stockItemRepo, movementRepo);

    await expect(useCase.execute("order-1")).resolves.toBeUndefined();
    expect(movementRepo.create).not.toHaveBeenCalled();
    expect(stockItemRepo.update).not.toHaveBeenCalled();
  });

  it("deve ignorar item que não existe no repositório", async () => {
    const reservations = [makeReservation("item-inexistente", 3)];
    const stockItemRepo = makeStockItemRepo([]); // nenhum item
    const movementRepo = makeMovementRepo(reservations);
    const useCase = new ReverseStockReservations(stockItemRepo, movementRepo);

    // Não deve lançar erro
    await expect(useCase.execute("order-1")).resolves.toBeUndefined();
    expect(movementRepo.create).not.toHaveBeenCalled();
  });
});
