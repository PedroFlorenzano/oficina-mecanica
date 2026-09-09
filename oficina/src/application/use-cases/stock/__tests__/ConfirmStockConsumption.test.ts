import { ConfirmStockConsumption } from "@/application/use-cases/stock/ConfirmStockConsumption";
import { ReverseStockReservations } from "@/application/use-cases/stock/ReverseStockReservations";
import { IStockItemRepository, StockItemData } from "@/domain/repositories/IStockItemRepository";
import { IStockMovementRepository, StockMovementData } from "@/domain/repositories/IStockMovementRepository";

const findManyMock = jest.fn();
const updateMock = jest.fn();

jest.mock("@/infrastructure/database/prisma", () => ({
  prisma: {
    orderPart: {
      findMany: (...args: unknown[]) => findManyMock(...args),
      update: (...args: unknown[]) => updateMock(...args),
    },
  },
}));

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
  supplier: null,
  costPrice: 10,
  sellPrice: 20,
  avgCost: 10,
  profitMargin: 100,
  active: true,
  tenantId: "tenant-1",
});

const makeReservation = (stockItemId: string, quantity: number): StockMovementData => ({
  id: `mov-${stockItemId}`,
  type: "RESERVED",
  quantity,
  reason: "Reserva para OS order-1",
  document: null,
  supplier: null,
  unitCost: 10,
  orderId: "order-1",
  balanceBefore: quantity,
  balanceAfter: 0,
  stockItemId,
  createdAt: new Date(),
});

const makeStockItemRepo = (items: StockItemData[]): IStockItemRepository =>
  ({
    findById: jest.fn().mockImplementation((id: string) =>
      Promise.resolve(items.find((i) => i.id === id) ?? null)
    ),
    findByCode: jest.fn(),
    findAll: jest.fn(),
    search: jest.fn(),
    findByApplication: jest.fn(),
    findLowStock: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn().mockResolvedValue({} as StockItemData),
    delete: jest.fn(),
    countMovements: jest.fn(),
    countOrderParts: jest.fn(),
    createEntryTransaction: jest.fn(),
  }) as IStockItemRepository;

const makeMovementRepo = (pending: StockMovementData[]): IStockMovementRepository =>
  ({
    create: jest.fn().mockResolvedValue({} as StockMovementData),
    findPendingReservations: jest.fn().mockResolvedValue(pending),
    findByOrderId: jest.fn(),
    findByStockItemId: jest.fn(),
  }) as IStockMovementRepository;

const makeReverse = (): ReverseStockReservations =>
  ({ execute: jest.fn().mockResolvedValue(undefined) }) as unknown as ReverseStockReservations;

describe("ConfirmStockConsumption", () => {
  beforeEach(() => {
    findManyMock.mockReset();
    updateMock.mockReset().mockResolvedValue({});
  });

  it("liquida a reserva existente e marca a peça como usada", async () => {
    findManyMock.mockResolvedValue([
      { id: "part-1", description: "Filtro", quantity: 2, stockItemId: "item-1" },
    ]);
    const stockItemRepo = makeStockItemRepo([makeItem("item-1", 3)]);
    const movementRepo = makeMovementRepo([makeReservation("item-1", 2)]);
    const useCase = new ConfirmStockConsumption(stockItemRepo, movementRepo, makeReverse());

    const warnings = await useCase.execute("order-1");

    expect(warnings).toEqual([]);
    expect(movementRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "CONSUMPTION",
        quantity: 2,
        balanceBefore: 3,
        balanceAfter: 3, // saldo já havia sido decrementado na reserva
        stockItemId: "item-1",
      })
    );
    // Reserva liquidada não altera o saldo novamente
    expect(stockItemRepo.update).not.toHaveBeenCalled();
    expect(updateMock).toHaveBeenCalledWith({ where: { id: "part-1" }, data: { used: true } });
  });

  it("dá baixa real quando a peça não tinha reserva", async () => {
    findManyMock.mockResolvedValue([
      { id: "part-1", description: "Pastilha", quantity: 2, stockItemId: "item-1" },
    ]);
    const stockItemRepo = makeStockItemRepo([makeItem("item-1", 5)]);
    const movementRepo = makeMovementRepo([]);
    const useCase = new ConfirmStockConsumption(stockItemRepo, movementRepo, makeReverse());

    const warnings = await useCase.execute("order-1");

    expect(warnings).toEqual([]);
    expect(movementRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: "CONSUMPTION", balanceBefore: 5, balanceAfter: 3 })
    );
    expect(stockItemRepo.update).toHaveBeenCalledWith("item-1", { quantity: 3 });
  });

  it("não deixa o saldo negativo e retorna aviso quando falta peça", async () => {
    findManyMock.mockResolvedValue([
      { id: "part-1", description: "Amortecedor", quantity: 2, stockItemId: "item-1" },
    ]);
    const stockItemRepo = makeStockItemRepo([makeItem("item-1", 0)]);
    const movementRepo = makeMovementRepo([]);
    const useCase = new ConfirmStockConsumption(stockItemRepo, movementRepo, makeReverse());

    const warnings = await useCase.execute("order-1");

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("Amortecedor");
    expect(movementRepo.create).not.toHaveBeenCalled();
    expect(stockItemRepo.update).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("estorna reservas restantes (peças não aprovadas)", async () => {
    findManyMock.mockResolvedValue([]);
    const stockItemRepo = makeStockItemRepo([]);
    const movementRepo = makeMovementRepo([]);
    const reverse = makeReverse();
    const useCase = new ConfirmStockConsumption(stockItemRepo, movementRepo, reverse);

    await useCase.execute("order-1");

    expect(reverse.execute).toHaveBeenCalledWith("order-1");
  });
});
