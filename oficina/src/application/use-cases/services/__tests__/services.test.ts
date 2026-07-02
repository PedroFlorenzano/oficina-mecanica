import { CreateService } from "@/application/use-cases/services/CreateService";
import { DeleteService } from "@/application/use-cases/services/DeleteService";
import { IServiceCatalogRepository, ServiceCatalogData } from "@/domain/repositories/IServiceCatalogRepository";
import { ValidationError, BusinessRuleError } from "@/domain/errors/DomainError";

const makeService = (overrides: Partial<ServiceCatalogData> = {}): ServiceCatalogData => ({
  id: "svc-1",
  code: "SVC001",
  description: "Troca de Óleo",
  category: "Manutenção",
  estimatedTime: 30,
  defaultPrice: 150.0,
  pricingType: "VALUE",
  commissionRate: 10,
  warrantyDays: 90,
  active: true,
  tenantId: "tenant-1",
  ...overrides,
});

const makeRepo = (service: ServiceCatalogData | null = makeService(), orderCount = 0): IServiceCatalogRepository => ({
  findById: jest.fn().mockResolvedValue(service),
  findAll: jest.fn().mockResolvedValue([]),
  create: jest.fn().mockImplementation((data) => Promise.resolve({ id: "new-svc", ...data })),
  update: jest.fn().mockImplementation((id, data) => Promise.resolve({ ...makeService(), id, ...data })),
  delete: jest.fn().mockResolvedValue(undefined),
  countOrderServices: jest.fn().mockResolvedValue(orderCount),
});

describe("CreateService", () => {
  it("deve criar serviço com dados válidos", async () => {
    const repo = makeRepo();
    const useCase = new CreateService(repo);

    const result = await useCase.execute(
      { description: "Alinhamento", defaultPrice: 80, category: "Suspensão" },
      "tenant-1"
    );

    expect(result.id).toBe("new-svc");
    expect(result.description).toBe("Alinhamento");
    expect(repo.create).toHaveBeenCalled();
  });

  it("deve lançar ValidationError se descrição vazia", async () => {
    const repo = makeRepo();
    const useCase = new CreateService(repo);

    await expect(
      useCase.execute({ description: "", defaultPrice: 100 }, "tenant-1")
    ).rejects.toThrow(ValidationError);
  });

  it("deve lançar ValidationError se preço negativo", async () => {
    const repo = makeRepo();
    const useCase = new CreateService(repo);

    await expect(
      useCase.execute({ description: "Serviço", defaultPrice: -10 }, "tenant-1")
    ).rejects.toThrow(ValidationError);
  });

  it("deve lançar ValidationError se preço null", async () => {
    const repo = makeRepo();
    const useCase = new CreateService(repo);

    await expect(
      useCase.execute({ description: "Serviço", defaultPrice: null as unknown as number }, "tenant-1")
    ).rejects.toThrow(ValidationError);
  });

  it("deve definir active true por padrão", async () => {
    const repo = makeRepo();
    const useCase = new CreateService(repo);

    await useCase.execute({ description: "Serviço", defaultPrice: 50 }, "tenant-1");

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ active: true })
    );
  });

  it("deve aceitar preço zero", async () => {
    const repo = makeRepo();
    const useCase = new CreateService(repo);

    const result = await useCase.execute(
      { description: "Cortesia", defaultPrice: 0 },
      "tenant-1"
    );

    expect(result.defaultPrice).toBe(0);
  });

  it("deve converter commissionRate e warrantyDays para number", async () => {
    const repo = makeRepo();
    const useCase = new CreateService(repo);

    await useCase.execute(
      { description: "Serviço", defaultPrice: 100, commissionRate: "15", warrantyDays: "90" },
      "tenant-1"
    );

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ commissionRate: 15, warrantyDays: 90 })
    );
  });
});

describe("DeleteService", () => {
  it("deve deletar serviço sem ordens vinculadas", async () => {
    const repo = makeRepo(makeService(), 0);
    const useCase = new DeleteService(repo);

    await useCase.execute("svc-1");

    expect(repo.delete).toHaveBeenCalledWith("svc-1");
  });

  it("deve lançar BusinessRuleError se serviço tem ordens vinculadas", async () => {
    const repo = makeRepo(makeService(), 5);
    const useCase = new DeleteService(repo);

    await expect(useCase.execute("svc-1")).rejects.toThrow(BusinessRuleError);
  });
});
