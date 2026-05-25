import { CancelOrder } from "@/application/use-cases/orders/CancelOrder";
import { IServiceOrderRepository } from "@/domain/repositories/IServiceOrderRepository";
import { ReverseStockReservations } from "@/application/use-cases/stock/ReverseStockReservations";
import { NotFoundError, BusinessRuleError, ValidationError } from "@/domain/errors/DomainError";

const makeOrder = (status: string, tenantId = "tenant-1") => ({
  id: "order-1",
  number: 42,
  status,
  mileage: 50000,
  notes: null,
  cancelReason: null,
  totalAmount: 1200.0,
  clientId: "client-1",
  vehicleId: "vehicle-1",
  tenantId,
  createdById: "user-1",
  createdAt: new Date(),
});

const makeOrderRepo = (order: ReturnType<typeof makeOrder> | null): IServiceOrderRepository => ({
  findById: jest.fn().mockResolvedValue(order),
  findAll: jest.fn(),
  findActive: jest.fn(),
  getNextNumber: jest.fn(),
  createWithComplaints: jest.fn(),
  createLegacy: jest.fn(),
  updateStatus: jest.fn(),
  findByClientId: jest.fn(),
  findByVehicleId: jest.fn(),
  findOilChangeOrders: jest.fn(),
  cancel: jest.fn().mockResolvedValue({ ...makeOrder("CANCELLED") }),
  replaceComplaints: jest.fn(),
});

const makeReverseReservations = (): ReverseStockReservations => ({
  execute: jest.fn().mockResolvedValue(undefined),
} as unknown as ReverseStockReservations);

describe("CancelOrder", () => {
  it("deve cancelar OS com sucesso e chamar ReverseStockReservations antes", async () => {
    const callOrder: string[] = [];
    const order = makeOrder("OPEN");
    const orderRepo = makeOrderRepo(order);
    (orderRepo.cancel as jest.Mock).mockImplementation(() => {
      callOrder.push("cancel");
      return Promise.resolve({ ...order, status: "CANCELLED" });
    });

    const reverseReservations = makeReverseReservations();
    (reverseReservations.execute as jest.Mock).mockImplementation(() => {
      callOrder.push("reverse");
      return Promise.resolve();
    });

    const useCase = new CancelOrder(orderRepo, reverseReservations);
    await useCase.execute("order-1", "Cliente desistiu do serviço", "tenant-1", "user-1");

    // Verifica que reverse foi chamado ANTES de cancel
    expect(callOrder).toEqual(["reverse", "cancel"]);
    expect(reverseReservations.execute).toHaveBeenCalledWith("order-1");
    expect(orderRepo.cancel).toHaveBeenCalledWith("order-1", "Cliente desistiu do serviço", "user-1");
  });

  it("deve lançar ValidationError quando motivo está vazio", async () => {
    const orderRepo = makeOrderRepo(makeOrder("OPEN"));
    const reverseReservations = makeReverseReservations();
    const useCase = new CancelOrder(orderRepo, reverseReservations);

    await expect(useCase.execute("order-1", "", "tenant-1", "user-1")).rejects.toThrow(ValidationError);
    await expect(useCase.execute("order-1", "  ", "tenant-1", "user-1")).rejects.toThrow(ValidationError);
    await expect(useCase.execute("order-1", "", "tenant-1", "user-1")).rejects.toThrow("Motivo do cancelamento é obrigatório");
  });

  it("deve lançar NotFoundError quando OS não existe", async () => {
    const orderRepo = makeOrderRepo(null);
    const reverseReservations = makeReverseReservations();
    const useCase = new CancelOrder(orderRepo, reverseReservations);

    await expect(useCase.execute("inexistente", "motivo", "tenant-1", "user-1")).rejects.toThrow(NotFoundError);
    await expect(useCase.execute("inexistente", "motivo", "tenant-1", "user-1")).rejects.toThrow("Ordem de serviço não encontrada");
  });

  it("deve lançar NotFoundError quando OS é de outro tenant", async () => {
    const orderRepo = makeOrderRepo(makeOrder("OPEN", "outro-tenant"));
    const reverseReservations = makeReverseReservations();
    const useCase = new CancelOrder(orderRepo, reverseReservations);

    await expect(useCase.execute("order-1", "motivo", "tenant-1", "user-1")).rejects.toThrow(NotFoundError);
  });

  it.each(["COMPLETED", "DELIVERED", "CANCELLED"])(
    "deve lançar BusinessRuleError quando status é %s (terminal)",
    async (status) => {
      const orderRepo = makeOrderRepo(makeOrder(status));
      const reverseReservations = makeReverseReservations();
      const useCase = new CancelOrder(orderRepo, reverseReservations);

      await expect(useCase.execute("order-1", "motivo", "tenant-1", "user-1")).rejects.toThrow(BusinessRuleError);
      await expect(useCase.execute("order-1", "motivo", "tenant-1", "user-1")).rejects.toThrow(
        `Não é possível cancelar uma OS com status ${status}`
      );
    }
  );

  it("deve fazer trim no motivo antes de persistir", async () => {
    const orderRepo = makeOrderRepo(makeOrder("IN_PROGRESS"));
    const reverseReservations = makeReverseReservations();
    const useCase = new CancelOrder(orderRepo, reverseReservations);

    await useCase.execute("order-1", "  motivo com espaços  ", "tenant-1", "user-1");

    expect(orderRepo.cancel).toHaveBeenCalledWith("order-1", "motivo com espaços", "user-1");
  });
});
