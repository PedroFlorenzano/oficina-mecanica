import { RegisterStockEntry } from "@/application/use-cases/stock/RegisterStockEntry";
import { IStockItemRepository, StockItemData } from "@/domain/repositories/IStockItemRepository";
import { IStockMovementRepository, StockMovementData } from "@/domain/repositories/IStockMovementRepository";

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
  supplier: null,
  costPrice: 25.0,
  sellPrice: 45.0,
  avgCost: 25.0,
  profitMargin: 0.8,
  active: true,
  tenantId: "tenant-1",
  ...overrides,
});

const makeRepos = (item: StockItemData) => {
  const stockItemRepo: IStockItemRepository = {
    findById: jest.fn().mockResolvedValue(item),
    findByCode: jest.fn(),
    findAll: jest.fn(),
    findLowStock: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    countMovements: jest.fn(),
    countOrderParts: jest.fn(),
    createEntryTransaction: jest.fn().mockImplementation((_id, _mov, update) =>
      Promise.resolve({ ...item, ...update })
    ),
  };
  const movementRepo: IStockMovementRepository = {
    create: jest.fn().mockResolvedValue({} as StockMovementData),
    findPendingReservations: jest.fn(),
    findByOrderId: jest.fn(),
    findByStockItemId: jest.fn(),
  };
  return { stockItemRepo, movementRepo };
};

describe("RegisterStockEntry — cálculo de CMP", () => {
  it("CMP = unitCost quando saldo anterior é 0", async () => {
    const item = makeItem({ quantity: 0, avgCost: 0 });
    const { stockItemRepo, movementRepo } = makeRepos(item);
    const useCase = new RegisterStockEntry(stockItemRepo, movementRepo);

    await useCase.execute("item-1", { quantity: 5, unitCost: 30.0 }, "tenant-1");

    expect(stockItemRepo.createEntryTransaction).toHaveBeenCalledWith(
      "item-1",
      expect.objectContaining({ type: "IN", quantity: 5, balanceBefore: 0, balanceAfter: 5 }),
      expect.objectContaining({ avgCost: 30.0, quantity: 5 })
    );
  });

  it("CMP = média ponderada quando saldo > 0", async () => {
    // saldo=10, avgCost=25, entrada=5 a 30
    // CMP = (10×25 + 5×30) / 15 = (250+150)/15 = 400/15 = 26.666... → 26.67
    const item = makeItem({ quantity: 10, avgCost: 25.0 });
    const { stockItemRepo, movementRepo } = makeRepos(item);
    const useCase = new RegisterStockEntry(stockItemRepo, movementRepo);

    await useCase.execute("item-1", { quantity: 5, unitCost: 30.0 }, "tenant-1");

    expect(stockItemRepo.createEntryTransaction).toHaveBeenCalledWith(
      "item-1",
      expect.anything(),
      expect.objectContaining({ avgCost: 26.67, quantity: 15 })
    );
  });

  it("CMP com valores decimais complexos arredonda para 2 casas", async () => {
    // saldo=3, avgCost=12.33, entrada=2 a 15.77
    // CMP = (3×12.33 + 2×15.77) / 5 = (36.99+31.54)/5 = 68.53/5 = 13.706 → 13.71
    const item = makeItem({ quantity: 3, avgCost: 12.33 });
    const { stockItemRepo, movementRepo } = makeRepos(item);
    const useCase = new RegisterStockEntry(stockItemRepo, movementRepo);

    await useCase.execute("item-1", { quantity: 2, unitCost: 15.77 }, "tenant-1");

    expect(stockItemRepo.createEntryTransaction).toHaveBeenCalledWith(
      "item-1",
      expect.anything(),
      expect.objectContaining({ avgCost: 13.71, quantity: 5 })
    );
  });

  it("CMP não muda quando unitCost = avgCost atual", async () => {
    const item = makeItem({ quantity: 10, avgCost: 25.0 });
    const { stockItemRepo, movementRepo } = makeRepos(item);
    const useCase = new RegisterStockEntry(stockItemRepo, movementRepo);

    await useCase.execute("item-1", { quantity: 5, unitCost: 25.0 }, "tenant-1");

    expect(stockItemRepo.createEntryTransaction).toHaveBeenCalledWith(
      "item-1",
      expect.anything(),
      expect.objectContaining({ avgCost: 25.0, quantity: 15 })
    );
  });

  it("CMP com entrada de custo 0 (doação/bonificação)", async () => {
    // saldo=10, avgCost=25, entrada=5 a 0
    // CMP = (10×25 + 5×0) / 15 = 250/15 = 16.666... → 16.67
    const item = makeItem({ quantity: 10, avgCost: 25.0 });
    const { stockItemRepo, movementRepo } = makeRepos(item);
    const useCase = new RegisterStockEntry(stockItemRepo, movementRepo);

    await useCase.execute("item-1", { quantity: 5, unitCost: 0 }, "tenant-1");

    expect(stockItemRepo.createEntryTransaction).toHaveBeenCalledWith(
      "item-1",
      expect.anything(),
      expect.objectContaining({ avgCost: 16.67, quantity: 15 })
    );
  });

  it("rejeita quantidade <= 0", async () => {
    const item = makeItem();
    const { stockItemRepo, movementRepo } = makeRepos(item);
    const useCase = new RegisterStockEntry(stockItemRepo, movementRepo);

    await expect(
      useCase.execute("item-1", { quantity: 0, unitCost: 10 }, "tenant-1")
    ).rejects.toThrow("Quantidade deve ser maior que zero");

    await expect(
      useCase.execute("item-1", { quantity: -1, unitCost: 10 }, "tenant-1")
    ).rejects.toThrow("Quantidade deve ser maior que zero");
  });

  it("rejeita custo unitário negativo", async () => {
    const item = makeItem();
    const { stockItemRepo, movementRepo } = makeRepos(item);
    const useCase = new RegisterStockEntry(stockItemRepo, movementRepo);

    await expect(
      useCase.execute("item-1", { quantity: 5, unitCost: -1 }, "tenant-1")
    ).rejects.toThrow("Custo unitário não pode ser negativo");
  });

  it("grava balanceBefore e balanceAfter corretamente", async () => {
    const item = makeItem({ quantity: 7 });
    const { stockItemRepo, movementRepo } = makeRepos(item);
    const useCase = new RegisterStockEntry(stockItemRepo, movementRepo);

    await useCase.execute("item-1", { quantity: 3, unitCost: 20 }, "tenant-1");

    expect(stockItemRepo.createEntryTransaction).toHaveBeenCalledWith(
      "item-1",
      expect.objectContaining({ balanceBefore: 7, balanceAfter: 10 }),
      expect.anything()
    );
  });
});
