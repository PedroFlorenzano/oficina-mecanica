import { IssueFiscalInvoice } from "@/application/use-cases/fiscal/IssueFiscalInvoice";
import { IFiscalRepository } from "@/domain/repositories/IFiscalRepository";
import { IServiceOrderRepository } from "@/domain/repositories/IServiceOrderRepository";

const makeOrder = (parts: any[], services: any[]) => ({
  id: "order-1",
  number: 42,
  status: "COMPLETED",
  tenantId: "tenant-1",
  totalAmount: 1000,
  parts,
  services,
  complaints: [],
});

const makeRepos = (order: any, config: any = { enabled: true }) => {
  const fiscalRepo: Partial<IFiscalRepository> = {
    getConfig: jest.fn().mockResolvedValue(config),
    findInvoicesByOrder: jest.fn().mockResolvedValue([]),
    createInvoice: jest.fn().mockImplementation((data) => Promise.resolve({ id: "inv-1", ...data })),
  };
  const orderRepo: Partial<IServiceOrderRepository> = {
    findById: jest.fn().mockResolvedValue(order),
  };
  return {
    fiscalRepo: fiscalRepo as IFiscalRepository,
    orderRepo: orderRepo as IServiceOrderRepository,
  };
};

describe("IssueFiscalInvoice — cálculos financeiros", () => {
  it("NF-e totalAmount = soma dos totalPrice das peças", async () => {
    const parts = [
      { description: "Filtro", quantity: 1, unitPrice: 45, totalPrice: 45, used: true },
      { description: "Óleo", quantity: 4, unitPrice: 32, totalPrice: 128, used: true },
    ];
    const { fiscalRepo, orderRepo } = makeRepos(makeOrder(parts, []));
    const useCase = new IssueFiscalInvoice(fiscalRepo, orderRepo);

    await useCase.execute("order-1", "NFE", "tenant-1");

    expect(fiscalRepo.createInvoice).toHaveBeenCalledWith(
      expect.objectContaining({ totalAmount: 173 })
    );
  });

  it("NFS-e totalAmount = soma dos preços dos serviços", async () => {
    const services = [
      { description: "Troca de óleo", price: 60 },
      { description: "Alinhamento", price: 80 },
    ];
    const { fiscalRepo, orderRepo } = makeRepos(makeOrder([], services));
    const useCase = new IssueFiscalInvoice(fiscalRepo, orderRepo);

    await useCase.execute("order-1", "NFSE", "tenant-1");

    expect(fiscalRepo.createInvoice).toHaveBeenCalledWith(
      expect.objectContaining({ totalAmount: 140 })
    );
  });

  it("NF-e filtra peças com used=false (apenas usadas entram na nota)", async () => {
    const parts = [
      { description: "Filtro usado", quantity: 1, unitPrice: 45, totalPrice: 45, used: true },
      { description: "Peça não usada", quantity: 1, unitPrice: 100, totalPrice: 100, used: false },
    ];
    const { fiscalRepo, orderRepo } = makeRepos(makeOrder(parts, []));
    const useCase = new IssueFiscalInvoice(fiscalRepo, orderRepo);

    await useCase.execute("order-1", "NFE", "tenant-1");

    const call = (fiscalRepo.createInvoice as jest.Mock).mock.calls[0][0];
    expect(call.items).toHaveLength(1);
    expect(call.items[0].description).toBe("Filtro usado");
    expect(call.totalAmount).toBe(45);
  });

  it("rejeita emissão para OS não concluída", async () => {
    const order = { ...makeOrder([], [{ description: "Svc", price: 100 }]), status: "IN_PROGRESS" };
    const { fiscalRepo, orderRepo } = makeRepos(order);
    const useCase = new IssueFiscalInvoice(fiscalRepo, orderRepo);

    await expect(useCase.execute("order-1", "NFE", "tenant-1")).rejects.toThrow(
      "Nota fiscal só pode ser emitida para OS concluída ou entregue"
    );
  });

  it("rejeita NF-e sem peças", async () => {
    const { fiscalRepo, orderRepo } = makeRepos(makeOrder([], [{ description: "Svc", price: 100 }]));
    const useCase = new IssueFiscalInvoice(fiscalRepo, orderRepo);

    await expect(useCase.execute("order-1", "NFE", "tenant-1")).rejects.toThrow(
      "Nenhum produto encontrado na OS para emissão"
    );
  });

  it("rejeita NFS-e sem serviços", async () => {
    const { fiscalRepo, orderRepo } = makeRepos(
      makeOrder([{ description: "Peça", quantity: 1, unitPrice: 50, totalPrice: 50, used: true }], [])
    );
    const useCase = new IssueFiscalInvoice(fiscalRepo, orderRepo);

    await expect(useCase.execute("order-1", "NFSE", "tenant-1")).rejects.toThrow(
      "Nenhum serviço encontrado na OS para emissão"
    );
  });
});
