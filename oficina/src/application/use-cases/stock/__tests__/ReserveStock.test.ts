import { ReserveStock } from "@/application/use-cases/stock/ReserveStock";
import { IStockItemRepository, StockItemData } from "@/domain/repositories/IStockItemRepository";
import { IStockMovementRepository, StockMovementData } from "@/domain/repositories/IStockMovementRepository";
import { NotFoundError, BusinessRuleError } from "@/domain/errors/DomainError";

const makeItem = (overrides: Partial<StockItemData> = {}): StockItemData => ({
  id: "item-1",
  code: "P001",
  barcode: null,
  description: "Filtro de óleo",
  brand: "Mann",
  unit: "UN",
  minQuantity: 2,
  quantity: 10,
  location: null,
  costPrice: 25.0,
  sellPrice: 45.0,
  avgCost: 25.0,
  profitMargin: 0.8,
  active: true,
  tenantId: "tenant-1",
  ...overrides,
});

const makeStockItemRepo = (item: StockItemData | null = makeItem()): IStockItemRepository => ({
  findById: jest.fn().mockResolvedValue(item),
  findByCode: jest.fn(),
  findAll: jest.fn(),
  count: jest.fn(),
  create: jest.fn(),
  update: jest.fn().mockResolvedValue(item),
  delete: jest.fn(),
  countMovements: jest.fn(),
  countOrderParts: jest.fn(),
});

const makeMovementRepo = (): IStockMovementRepository => ({
  create: jest.fn().mockResolvedValue({} as StockMovementData),
  findPendingReservations: jest.fn(),
  findByOrderId: jest.fn(),
});

describe("ReserveStock", () => {
  it("deve reservar estoque com sucesso e retornar dados corretos", async () => {
    const item = makeItem({ quantity: 10 });
    const stockItemRepo = makeStockItemRepo(item);
    const movementRepo = makeMovementRepo();
    const useCase = new ReserveStock(stockItemRepo, movementRepo);

    const result = await useCase.execute("item-1", 3, "order-1", "tenant-1");

    expect(result.reserved).toBe(3);
    expect(result.balanceAfter).toBe(7);
    expect(stockItemRepo.update).toHaveBeenCalledWith("item-1", { quantity: 7 });
  });

  it("deve criar movimento com tipo RESERVED e balanceBefore/balanceAfter corretos", async () => {
    const item = makeItem({ quantity: 10 });
    const stockItemRepo = makeStockItemRepo(item);
    const movementRepo = makeMovementRepo();
    const useCase = new ReserveStock(stockItemRepo, movementRepo);

    await useCase.execute("item-1", 4, "order-1", "tenant-1");

    expect(movementRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "RESERVED",
        quantity: 4,
        balanceBefore: 10,
        balanceAfter: 6,
        stockItemId: "item-1",
        orderId: "order-1",
      })
    );
  });

  it("deve lançar NotFoundError quando item não existe", async () => {
    const stockItemRepo = makeStockItemRepo(null);
    const movementRepo = makeMovementRepo();
    const useCase = new ReserveStock(stockItemRepo, movementRepo);

    await expect(useCase.execute("inexistente", 1, "order-1", "tenant-1")).rejects.toThrow(NotFoundError);
  });

  it("deve lançar NotFoundError quando item é de outro tenant", async () => {
    const item = makeItem({ tenantId: "outro-tenant" });
    const stockItemRepo = makeStockItemRepo(item);
    const movementRepo = makeMovementRepo();
    const useCase = new ReserveStock(stockItemRepo, movementRepo);

    await expect(useCase.execute("item-1", 1, "order-1", "tenant-1")).rejects.toThrow(NotFoundError);
  });

  it("deve lançar BusinessRuleError quando saldo é insuficiente", async () => {
    const item = makeItem({ quantity: 2 });
    const stockItemRepo = makeStockItemRepo(item);
    const movementRepo = makeMovementRepo();
    const useCase = new ReserveStock(stockItemRepo, movementRepo);

    await expect(useCase.execute("item-1", 5, "order-1", "tenant-1")).rejects.toThrow(BusinessRuleError);
    await expect(useCase.execute("item-1", 5, "order-1", "tenant-1")).rejects.toThrow(
      "Saldo insuficiente: disponível 2, solicitado 5"
    );
  });

  it("deve permitir reserva exatamente igual ao saldo disponível", async () => {
    const item = makeItem({ quantity: 5 });
    const stockItemRepo = makeStockItemRepo(item);
    const movementRepo = makeMovementRepo();
    const useCase = new ReserveStock(stockItemRepo, movementRepo);

    const result = await useCase.execute("item-1", 5, "order-1", "tenant-1");

    expect(result.balanceAfter).toBe(0);
  });
});
