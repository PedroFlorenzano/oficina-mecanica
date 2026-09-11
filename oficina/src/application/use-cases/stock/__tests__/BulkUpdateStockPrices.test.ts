import {
  BulkUpdateStockPrices,
  computeNewSellPrice,
} from "@/application/use-cases/stock/BulkUpdateStockPrices";
import { IStockItemRepository, StockItemData, BulkPriceFilter } from "@/domain/repositories/IStockItemRepository";
import { ValidationError } from "@/domain/errors/DomainError";

const makeItem = (over: Partial<StockItemData> = {}): StockItemData => ({
  id: "item-1",
  code: "P1",
  barcode: null,
  description: "Filtro de óleo",
  brand: "Bosch",
  unit: "UN",
  minQuantity: 0,
  quantity: 10,
  location: null,
  supplier: null,
  costPrice: 20,
  sellPrice: 40,
  avgCost: 22,
  profitMargin: 100,
  active: true,
  tenantId: "tenant-1",
  ...over,
});

describe("computeNewSellPrice", () => {
  it("percent aplica variação sobre o preço de venda atual", () => {
    expect(computeNewSellPrice(makeItem({ sellPrice: 100 }), "percent", 10)).toBe(110);
    expect(computeNewSellPrice(makeItem({ sellPrice: 100 }), "percent", -5)).toBe(95);
  });

  it("margin recalcula a partir do custo", () => {
    expect(computeNewSellPrice(makeItem({ costPrice: 20 }), "margin", 40)).toBe(28);
    expect(computeNewSellPrice(makeItem({ costPrice: 20 }), "margin", 100)).toBe(40);
  });

  it("margin usa avgCost quando costPrice é zero", () => {
    expect(computeNewSellPrice(makeItem({ costPrice: 0, avgCost: 25 }), "margin", 20)).toBe(30);
  });

  it("arredonda para 2 casas", () => {
    expect(computeNewSellPrice(makeItem({ sellPrice: 33.333 }), "percent", 0)).toBe(33.33);
    expect(computeNewSellPrice(makeItem({ costPrice: 9.99 }), "margin", 33)).toBe(13.29);
  });

  it("nunca retorna valor negativo", () => {
    expect(computeNewSellPrice(makeItem({ sellPrice: 10 }), "percent", -100)).toBe(0);
  });
});

const makeRepo = (items: StockItemData[]): IStockItemRepository & {
  bulkUpdatePrices: jest.Mock;
  findForBulk: jest.Mock;
} => {
  const repo = {
    findById: jest.fn(),
    findByCode: jest.fn(),
    findAll: jest.fn(),
    search: jest.fn(),
    findByApplication: jest.fn(),
    findLowStock: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    countMovements: jest.fn(),
    countOrderParts: jest.fn(),
    createEntryTransaction: jest.fn(),
    findForBulk: jest.fn(async (_tenantId: string, _filter: BulkPriceFilter) => items),
    bulkUpdatePrices: jest.fn(async (_tenantId: string, updates: unknown[]) => updates.length),
  };
  return repo as unknown as IStockItemRepository & { bulkUpdatePrices: jest.Mock; findForBulk: jest.Mock };
};

describe("BulkUpdateStockPrices", () => {
  it("aplica ajuste percentual e retorna quantidade afetada", async () => {
    const items = [makeItem({ id: "a", sellPrice: 100 }), makeItem({ id: "b", sellPrice: 50 })];
    const repo = makeRepo(items);
    const useCase = new BulkUpdateStockPrices(repo);

    const result = await useCase.execute({ filter: { brand: "Bosch" }, mode: "percent", value: 10 }, "tenant-1");

    expect(result.affected).toBe(2);
    expect(repo.bulkUpdatePrices).toHaveBeenCalledWith("tenant-1", [
      { id: "a", sellPrice: 110 },
      { id: "b", sellPrice: 55 },
    ]);
  });

  it("aplica nova margem e persiste profitMargin", async () => {
    const items = [makeItem({ id: "a", costPrice: 20 })];
    const repo = makeRepo(items);
    const useCase = new BulkUpdateStockPrices(repo);

    await useCase.execute({ filter: { ids: ["a"] }, mode: "margin", value: 50 }, "tenant-1");

    expect(repo.bulkUpdatePrices).toHaveBeenCalledWith("tenant-1", [
      { id: "a", sellPrice: 30, profitMargin: 50 },
    ]);
  });

  it("retorna 0 e não persiste quando nenhum item casa", async () => {
    const repo = makeRepo([]);
    const useCase = new BulkUpdateStockPrices(repo);

    const result = await useCase.execute({ filter: { term: "inexistente" }, mode: "percent", value: 5 }, "tenant-1");

    expect(result.affected).toBe(0);
    expect(repo.bulkUpdatePrices).not.toHaveBeenCalled();
  });

  it("rejeita quando não há critério de seleção", async () => {
    const repo = makeRepo([]);
    const useCase = new BulkUpdateStockPrices(repo);
    await expect(useCase.execute({ filter: {}, mode: "percent", value: 5 }, "tenant-1")).rejects.toBeInstanceOf(
      ValidationError
    );
  });

  it("rejeita margem negativa", async () => {
    const repo = makeRepo([makeItem()]);
    const useCase = new BulkUpdateStockPrices(repo);
    await expect(
      useCase.execute({ filter: { brand: "Bosch" }, mode: "margin", value: -1 }, "tenant-1")
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
