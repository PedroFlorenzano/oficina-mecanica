import { UpdateOrderStatus } from "@/application/use-cases/orders/UpdateOrderStatus";
import { IServiceOrderRepository } from "@/domain/repositories/IServiceOrderRepository";

const makeOrder = (status = "OPEN", tenantId = "tenant-1") => ({
  id: "order-1",
  number: 1,
  status,
  tenantId,
  mileage: 1000,
  notes: null,
  totalAmount: 100,
  clientId: "client-1",
  vehicleId: "vehicle-1",
  createdById: "user-1",
  createdAt: new Date(),
});

const makeRepo = (order: ReturnType<typeof makeOrder> | null): IServiceOrderRepository =>
  ({
    findById: jest.fn().mockResolvedValue(order),
    updateStatus: jest.fn().mockImplementation((id: string, status: string) =>
      Promise.resolve({ ...order, id, status })
    ),
  } as unknown as IServiceOrderRepository);

describe("UpdateOrderStatus", () => {
  it("muda o status de OS do próprio tenant", async () => {
    const repo = makeRepo(makeOrder());
    const useCase = new UpdateOrderStatus(repo);

    const result = await useCase.execute("order-1", "IN_PROGRESS", "user-1", "tenant-1");

    expect(result?.status).toBe("IN_PROGRESS");
    expect(repo.updateStatus).toHaveBeenCalledWith("order-1", "IN_PROGRESS", "user-1");
  });

  it("não enxerga OS de outra oficina", async () => {
    const repo = makeRepo(makeOrder("OPEN", "tenant-2"));
    const useCase = new UpdateOrderStatus(repo);

    await expect(
      useCase.execute("order-1", "IN_PROGRESS", "user-1", "tenant-1")
    ).rejects.toThrow("OS não encontrado");
    expect(repo.updateStatus).not.toHaveBeenCalled();
  });

  it("rejeita status fora do enum", async () => {
    const repo = makeRepo(makeOrder());
    const useCase = new UpdateOrderStatus(repo);

    await expect(
      useCase.execute("order-1", "PAGO", "user-1", "tenant-1")
    ).rejects.toThrow("Status inválido");
  });

  it("rejeita status vazio", async () => {
    const repo = makeRepo(makeOrder());
    const useCase = new UpdateOrderStatus(repo);

    await expect(useCase.execute("order-1", "", "user-1", "tenant-1")).rejects.toThrow(
      "Status é obrigatório"
    );
  });

  it("não muda status de OS entregue", async () => {
    const repo = makeRepo(makeOrder("DELIVERED"));
    const useCase = new UpdateOrderStatus(repo);

    await expect(
      useCase.execute("order-1", "IN_PROGRESS", "user-1", "tenant-1")
    ).rejects.toThrow("não pode mudar de status");
  });

  it("não muda status de OS cancelada", async () => {
    const repo = makeRepo(makeOrder("CANCELLED"));
    const useCase = new UpdateOrderStatus(repo);

    await expect(
      useCase.execute("order-1", "OPEN", "user-1", "tenant-1")
    ).rejects.toThrow("não pode mudar de status");
  });
});
