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
      parts: [{ id: "p1", description: "Filtro", quantity: 1, unitPrice: 40, stockItemId: "stock-1" as string | null }],
    },
  ],
  parts: [{ id: "p1", stockItemId: "stock-1" as string | null, quantity: 1 }],
});

const makeStockItem = (id: string, quantity = 10): StockItemData => ({
  id, code: "P001", barcode: null, description: "Item", brand: null, unit: "UN",
  minQuantity: 0, quantity, location: null, supplier: null,
  costPrice: 10, sellPrice: 20, avgCost: 10, profitMargin: 1, active: true, tenantId: "tenant-1",
});

// O fake precisa ser stateful: a reserva de estoque agora é feita a partir das peças
// **gravadas**, não da entrada da requisição.
const makeOrderRepo = (order = makeOrder()): IServiceOrderRepository => {
  let current: ReturnType<typeof makeOrder> = order;

  return {
    findById: jest.fn().mockImplementation(() => Promise.resolve(current)),
    findAll: jest.fn(),
    findActive: jest.fn(),
    getNextNumber: jest.fn(),
    createWithComplaints: jest.fn(),
    createLegacy: jest.fn(),
    updateStatus: jest.fn(),
    replaceComplaints: jest.fn().mockImplementation(
      (
        _orderId: string,
        _tenantId: string,
        complaints: { services: unknown[]; parts: { description: string; quantity: number; unitPrice: number; stockItemId?: string | null }[] }[],
        totalAmount: number
      ) => {
        current = {
          ...current,
          totalAmount,
          complaints: complaints.map((c, i) => ({
            id: `c${i + 1}`,
            services: c.services as ReturnType<typeof makeOrder>["complaints"][0]["services"],
            parts: c.parts.map((p, j) => ({
              id: `c${i + 1}p${j + 1}`,
              description: p.description,
              quantity: p.quantity,
              unitPrice: p.unitPrice,
              stockItemId: p.stockItemId ?? null,
            })),
          })),
          parts: [],
        };
        return Promise.resolve(current);
      }
    ),
    findByClientId: jest.fn(),
    findByVehicleId: jest.fn(),
    findOilChangeOrders: jest.fn(),
    cancel: jest.fn(),
    setItemApproval: jest.fn(),
    recordStatusHistory: jest.fn().mockResolvedValue(undefined),
    getStatusHistory: jest.fn().mockResolvedValue([]),
  } as unknown as IServiceOrderRepository;
};

const makeStockItemRepo = (items: StockItemData[] = [makeStockItem("stock-1")]): IStockItemRepository => ({
  findById: jest.fn().mockImplementation((id) => Promise.resolve(items.find((i) => i.id === id) ?? null)),
  findByCode: jest.fn(),
  findAll: jest.fn(),
  search: jest.fn(),
  findByApplication: jest.fn(),
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
      "order-1", "tenant-1", expect.anything(), 208, null, expect.anything()
    );
  });

  it("deve reverter reservas de estoque depois de gravar", async () => {
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

// --- Item 2: admin edita OS em andamento por configuração ---
type SettingsRepo = {
  get: jest.Mock;
  upsert: jest.Mock;
};
const makeSettingsRepo = (allowEditInProgress: boolean): SettingsRepo => ({
  get: jest.fn().mockResolvedValue({
    id: "cfg-1", tenantId: "tenant-1", allowEditInProgress, uppercaseInputs: false,
    createdAt: new Date(), updatedAt: new Date(),
  }),
  upsert: jest.fn(),
});

const makeVehicleRepo = () => ({
  findById: jest.fn(),
  findByPlate: jest.fn(),
  findByPlateExcluding: jest.fn(),
  search: jest.fn(),
  findAll: jest.fn(),
  findWithReminderEnabled: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  updateMileage: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn(),
  countOrders: jest.fn(),
});

describe("UpdateOrder — edição de OS em andamento (item 2)", () => {
  const validInput = {
    complaints: [
      {
        description: "Troca de óleo",
        services: [{ description: "Mão de obra", price: 80 }],
        parts: [],
      },
    ],
  };

  it("flag ON + admin → permite editar OS IN_PROGRESS", async () => {
    const orderRepo = makeOrderRepo(makeOrder("IN_PROGRESS"));
    const settingsRepo = makeSettingsRepo(true);
    const useCase = new UpdateOrder(
      orderRepo, makeStockItemRepo(), makeMovementRepo(),
      makeVehicleRepo() as never, settingsRepo as never
    );

    await expect(
      useCase.execute("order-1", validInput, "tenant-1", { userRole: "ADMIN", userId: "u1" })
    ).resolves.toBeDefined();
    expect(orderRepo.replaceComplaints).toHaveBeenCalled();
    // Registra a edição no histórico
    expect(orderRepo.recordStatusHistory).toHaveBeenCalledWith("order-1", "IN_PROGRESS", "u1");
  });

  it("flag ON + não-admin → bloqueia", async () => {
    const orderRepo = makeOrderRepo(makeOrder("IN_PROGRESS"));
    const settingsRepo = makeSettingsRepo(true);
    const useCase = new UpdateOrder(
      orderRepo, makeStockItemRepo(), makeMovementRepo(),
      makeVehicleRepo() as never, settingsRepo as never
    );

    await expect(
      useCase.execute("order-1", validInput, "tenant-1", { userRole: "MECHANIC", userId: "u1" })
    ).rejects.toThrow("Somente OS em status 'Aguardando Aprovação' pode ser editada");
  });

  it("flag OFF + admin → bloqueia", async () => {
    const orderRepo = makeOrderRepo(makeOrder("IN_PROGRESS"));
    const settingsRepo = makeSettingsRepo(false);
    const useCase = new UpdateOrder(
      orderRepo, makeStockItemRepo(), makeMovementRepo(),
      makeVehicleRepo() as never, settingsRepo as never
    );

    await expect(
      useCase.execute("order-1", validInput, "tenant-1", { userRole: "ADMIN", userId: "u1" })
    ).rejects.toThrow("Somente OS em status 'Aguardando Aprovação' pode ser editada");
  });

  it("flag OFF + não-admin → bloqueia", async () => {
    const orderRepo = makeOrderRepo(makeOrder("IN_PROGRESS"));
    const settingsRepo = makeSettingsRepo(false);
    const useCase = new UpdateOrder(
      orderRepo, makeStockItemRepo(), makeMovementRepo(),
      makeVehicleRepo() as never, settingsRepo as never
    );

    await expect(
      useCase.execute("order-1", validInput, "tenant-1", { userRole: "MECHANIC", userId: "u1" })
    ).rejects.toThrow("Somente OS em status 'Aguardando Aprovação' pode ser editada");
  });

  it("flag ON + admin → OS DELIVERED continua bloqueada", async () => {
    const orderRepo = makeOrderRepo(makeOrder("DELIVERED"));
    const settingsRepo = makeSettingsRepo(true);
    const useCase = new UpdateOrder(
      orderRepo, makeStockItemRepo(), makeMovementRepo(),
      makeVehicleRepo() as never, settingsRepo as never
    );

    await expect(
      useCase.execute("order-1", validInput, "tenant-1", { userRole: "ADMIN", userId: "u1" })
    ).rejects.toThrow("OS entregue ou cancelada não pode ser editada");
  });
});

describe("UpdateOrder — KM de saída (item 45)", () => {
  const makeOrderWithMileage = (mileage: number) => ({
    ...makeOrder("WAITING_APPROVAL"),
    mileage,
    vehicleId: "veh-1",
  });

  const inputWithMileageOut = (mileageOut: number | null) => ({
    complaints: [
      { description: "Serviço", services: [{ description: "Mão de obra", price: 80 }], parts: [] },
    ],
    mileageOut,
  });

  it("rejeita KM de saída menor que KM de entrada", async () => {
    const orderRepo = makeOrderRepo(makeOrderWithMileage(50000));
    const vehicleRepo = makeVehicleRepo();
    const useCase = new UpdateOrder(
      orderRepo, makeStockItemRepo(), makeMovementRepo(), vehicleRepo as never
    );

    await expect(
      useCase.execute("order-1", inputWithMileageOut(49000), "tenant-1")
    ).rejects.toThrow("não pode ser menor que o KM de entrada");
  });

  it("aceita KM de saída maior e atualiza a quilometragem do veículo", async () => {
    const orderRepo = makeOrderRepo(makeOrderWithMileage(50000));
    const vehicleRepo = makeVehicleRepo();
    const useCase = new UpdateOrder(
      orderRepo, makeStockItemRepo(), makeMovementRepo(), vehicleRepo as never
    );

    await useCase.execute("order-1", inputWithMileageOut(51000), "tenant-1");

    expect(vehicleRepo.updateMileage).toHaveBeenCalledWith("veh-1", 51000);
    expect(orderRepo.replaceComplaints).toHaveBeenCalledWith(
      "order-1", "tenant-1", expect.anything(), 80, null,
      expect.objectContaining({ mileageOut: 51000 })
    );
  });

  it("passa attendantId ao repositório (item 8)", async () => {
    const orderRepo = makeOrderRepo(makeOrderWithMileage(50000));
    const useCase = new UpdateOrder(
      orderRepo, makeStockItemRepo(), makeMovementRepo(), makeVehicleRepo() as never
    );

    await useCase.execute(
      "order-1",
      {
        complaints: [{ description: "S", services: [{ description: "M", price: 80 }], parts: [] }],
        attendantId: "att-1",
      },
      "tenant-1"
    );

    expect(orderRepo.replaceComplaints).toHaveBeenCalledWith(
      "order-1", "tenant-1", expect.anything(), 80, null,
      expect.objectContaining({ attendantId: "att-1" })
    );
  });
});
