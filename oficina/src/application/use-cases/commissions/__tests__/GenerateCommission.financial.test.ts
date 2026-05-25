import { GenerateCommission } from "@/application/use-cases/commissions/GenerateCommission";
import { ICommissionRepository } from "@/domain/repositories/ICommissionRepository";
import { IUserRepository } from "@/domain/repositories/IUserRepository";

const makeMechanic = (rate: number) => ({
  id: "mech-1",
  name: "João Mecânico",
  email: "joao@test.com",
  role: "MECHANIC" as const,
  active: true,
  commissionRate: rate,
  tenantId: "tenant-1",
});

const makeEligibleServices = (prices: number[]) =>
  prices.map((price, i) => ({
    id: `svc-${i}`,
    description: `Serviço ${i}`,
    price,
    orderId: `order-${i}`,
  }));

const makeRepos = (mechanic: ReturnType<typeof makeMechanic>, services: ReturnType<typeof makeEligibleServices>) => {
  const commissionRepo: Partial<ICommissionRepository> = {
    findOverlapping: jest.fn().mockResolvedValue(null),
    getEligibleServices: jest.fn().mockResolvedValue(services),
    create: jest.fn().mockImplementation((data) => Promise.resolve({ id: "comm-1", ...data })),
  };
  const userRepo: Partial<IUserRepository> = {
    findById: jest.fn().mockResolvedValue(mechanic),
  };
  return {
    commissionRepo: commissionRepo as ICommissionRepository,
    userRepo: userRepo as IUserRepository,
  };
};

describe("GenerateCommission — cálculos financeiros", () => {
  const input = { mechanicId: "mech-1", startDate: "2026-05-01", endDate: "2026-05-31" };

  it("commissionValue = Math.round(price × rate) / 100 para cada serviço", async () => {
    const mechanic = makeMechanic(15); // 15%
    const services = makeEligibleServices([200, 350, 100]);
    const { commissionRepo, userRepo } = makeRepos(mechanic, services);
    const useCase = new GenerateCommission(commissionRepo, userRepo);

    await useCase.execute(input, "tenant-1");

    // 200×15/100=30, 350×15/100=52.50, 100×15/100=15
    expect(commissionRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        commissionRate: 15,
        totalBase: 650,
        totalCommission: 97.5,
        items: [
          { orderServiceId: "svc-0", baseValue: 200, commissionValue: 30 },
          { orderServiceId: "svc-1", baseValue: 350, commissionValue: 52.5 },
          { orderServiceId: "svc-2", baseValue: 100, commissionValue: 15 },
        ],
      })
    );
  });

  it("commissionValue arredonda corretamente com decimais", async () => {
    const mechanic = makeMechanic(7.5); // 7.5%
    const services = makeEligibleServices([99.99, 150.50]);
    const { commissionRepo, userRepo } = makeRepos(mechanic, services);
    const useCase = new GenerateCommission(commissionRepo, userRepo);

    await useCase.execute(input, "tenant-1");

    // 99.99×7.5 = 749.925 → Math.round = 750 → /100 = 7.50
    // 150.50×7.5 = 1128.75 → Math.round = 1129 → /100 = 11.29
    expect(commissionRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        totalBase: 250.49,
        totalCommission: 18.79,
        items: [
          { orderServiceId: "svc-0", baseValue: 99.99, commissionValue: 7.5 },
          { orderServiceId: "svc-1", baseValue: 150.50, commissionValue: 11.29 },
        ],
      })
    );
  });

  it("totalCommission = soma dos commissionValue individuais (não totalBase × rate)", async () => {
    const mechanic = makeMechanic(10); // 10%
    const services = makeEligibleServices([33.33, 33.33, 33.34]);
    const { commissionRepo, userRepo } = makeRepos(mechanic, services);
    const useCase = new GenerateCommission(commissionRepo, userRepo);

    await useCase.execute(input, "tenant-1");

    // 33.33×10 = 333.3 → round = 333 → /100 = 3.33
    // 33.33×10 = 333.3 → round = 333 → /100 = 3.33
    // 33.34×10 = 333.4 → round = 333 → /100 = 3.33
    // totalCommission = 3.33 + 3.33 + 3.33 = 9.99
    // (vs totalBase×rate/100 = 100×10/100 = 10.00 — diferença de 1 centavo é esperada)
    expect(commissionRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        totalBase: 100,
        totalCommission: 9.99,
      })
    );
  });

  it("commissionRate = 0 rejeita com erro de validação", async () => {
    const mechanic = makeMechanic(0);
    const { commissionRepo, userRepo } = makeRepos(mechanic, []);
    const useCase = new GenerateCommission(commissionRepo, userRepo);

    await expect(useCase.execute(input, "tenant-1")).rejects.toThrow(
      "Mecânico não possui percentual de comissão configurado"
    );
  });

  it("snapshot do commissionRate é gravado na comissão", async () => {
    const mechanic = makeMechanic(12.5);
    const services = makeEligibleServices([500]);
    const { commissionRepo, userRepo } = makeRepos(mechanic, services);
    const useCase = new GenerateCommission(commissionRepo, userRepo);

    await useCase.execute(input, "tenant-1");

    expect(commissionRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ commissionRate: 12.5 })
    );
  });
});
