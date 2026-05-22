import { GenerateCommission } from "@/application/use-cases/commissions/GenerateCommission";
import { ApproveCommission } from "@/application/use-cases/commissions/ApproveCommission";
import { PayCommission } from "@/application/use-cases/commissions/PayCommission";
import { CancelCommission } from "@/application/use-cases/commissions/CancelCommission";
import { ListCommissions } from "@/application/use-cases/commissions/ListCommissions";
import { GetCommissionDetail } from "@/application/use-cases/commissions/GetCommissionDetail";
import { GetMechanicCommissionSummary } from "@/application/use-cases/commissions/GetMechanicCommissionSummary";
import { ICommissionRepository } from "@/domain/repositories/ICommissionRepository";
import { IUserRepository } from "@/domain/repositories/IUserRepository";
import { ValidationError, NotFoundError, ConflictError, ForbiddenError } from "@/domain/errors/DomainError";

const makeMechanic = (overrides = {}) => ({
  id: "mech-1",
  email: "mech@test.com",
  password: "hashed",
  name: "João Mecânico",
  role: "MECHANIC" as const,
  active: true,
  commissionRate: 10,
  tenantId: "tenant-1",
  failedLoginCount: 0,
  lockedUntil: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const makeCommission = (overrides = {}) => ({
  id: "comm-1",
  mechanicId: "mech-1",
  tenantId: "tenant-1",
  startDate: new Date("2026-05-01"),
  endDate: new Date("2026-05-31"),
  commissionRate: 10,
  totalBase: 1000,
  totalCommission: 100,
  status: "PENDING",
  approvedAt: null,
  approvedById: null,
  paidAt: null,
  paidById: null,
  cancelledAt: null,
  cancelledById: null,
  cancelReason: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  mechanic: { name: "João Mecânico" },
  items: [],
  ...overrides,
});

const makeCommissionRepo = (overrides = {}): ICommissionRepository => ({
  create: jest.fn().mockResolvedValue(makeCommission()),
  findById: jest.fn().mockResolvedValue(makeCommission()),
  findByIdWithItems: jest.fn().mockResolvedValue(makeCommission()),
  findAll: jest.fn().mockResolvedValue([makeCommission()]),
  findByMechanic: jest.fn().mockResolvedValue([makeCommission()]),
  findOverlapping: jest.fn().mockResolvedValue(null),
  updateStatus: jest.fn().mockResolvedValue(makeCommission()),
  getEligibleServices: jest.fn().mockResolvedValue([
    { id: "os-1", description: "Troca de óleo", price: 500, orderId: "order-1", orderNumber: 1, clientName: "Maria", vehiclePlate: "ABC1D23" },
    { id: "os-2", description: "Alinhamento", price: 500, orderId: "order-2", orderNumber: 2, clientName: "José", vehiclePlate: "DEF4G56" },
  ]),
  getMechanicSummary: jest.fn().mockResolvedValue({ totalPending: 100, totalApproved: 200, totalPaidMonth: 300, totalPaidAll: 1000 }),
  ...overrides,
});

const makeUserRepo = (overrides = {}): IUserRepository => ({
  findById: jest.fn().mockResolvedValue(makeMechanic()),
  findByEmail: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  incrementFailedLoginCount: jest.fn(),
  lockAccount: jest.fn(),
  resetLoginCounters: jest.fn(),
  ...overrides,
});

// ==================== GenerateCommission ====================
describe("GenerateCommission", () => {
  it("deve gerar comissão com sucesso", async () => {
    const commRepo = makeCommissionRepo();
    const userRepo = makeUserRepo();
    const uc = new GenerateCommission(commRepo, userRepo);

    await uc.execute({ mechanicId: "mech-1", startDate: "2026-05-01", endDate: "2026-05-31" }, "tenant-1");

    expect(commRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      mechanicId: "mech-1",
      tenantId: "tenant-1",
      commissionRate: 10,
      totalBase: 1000,
      totalCommission: 100,
    }));
  });

  it("deve rejeitar se campos obrigatórios faltam", async () => {
    const uc = new GenerateCommission(makeCommissionRepo(), makeUserRepo());
    await expect(uc.execute({ mechanicId: "", startDate: "2026-05-01", endDate: "2026-05-31" }, "t")).rejects.toThrow(ValidationError);
  });

  it("deve rejeitar se startDate >= endDate", async () => {
    const uc = new GenerateCommission(makeCommissionRepo(), makeUserRepo());
    await expect(uc.execute({ mechanicId: "mech-1", startDate: "2026-06-01", endDate: "2026-05-01" }, "t")).rejects.toThrow(ValidationError);
  });

  it("deve rejeitar se mecânico não encontrado", async () => {
    const userRepo = makeUserRepo({ findById: jest.fn().mockResolvedValue(null) });
    const uc = new GenerateCommission(makeCommissionRepo(), userRepo);
    await expect(uc.execute({ mechanicId: "mech-1", startDate: "2026-05-01", endDate: "2026-05-31" }, "t")).rejects.toThrow(NotFoundError);
  });

  it("deve rejeitar se usuário não é MECHANIC", async () => {
    const userRepo = makeUserRepo({ findById: jest.fn().mockResolvedValue(makeMechanic({ role: "ADMIN" })) });
    const uc = new GenerateCommission(makeCommissionRepo(), userRepo);
    await expect(uc.execute({ mechanicId: "mech-1", startDate: "2026-05-01", endDate: "2026-05-31" }, "t")).rejects.toThrow(ValidationError);
  });

  it("deve rejeitar se commissionRate é 0", async () => {
    const userRepo = makeUserRepo({ findById: jest.fn().mockResolvedValue(makeMechanic({ commissionRate: 0 })) });
    const uc = new GenerateCommission(makeCommissionRepo(), userRepo);
    await expect(uc.execute({ mechanicId: "mech-1", startDate: "2026-05-01", endDate: "2026-05-31" }, "t")).rejects.toThrow(ValidationError);
  });

  it("deve rejeitar se existe comissão sobreposta", async () => {
    const commRepo = makeCommissionRepo({ findOverlapping: jest.fn().mockResolvedValue(makeCommission()) });
    const uc = new GenerateCommission(commRepo, makeUserRepo());
    await expect(uc.execute({ mechanicId: "mech-1", startDate: "2026-05-01", endDate: "2026-05-31" }, "t")).rejects.toThrow(ConflictError);
  });

  it("deve rejeitar se não há serviços elegíveis", async () => {
    const commRepo = makeCommissionRepo({ getEligibleServices: jest.fn().mockResolvedValue([]) });
    const uc = new GenerateCommission(commRepo, makeUserRepo());
    await expect(uc.execute({ mechanicId: "mech-1", startDate: "2026-05-01", endDate: "2026-05-31" }, "t")).rejects.toThrow(ValidationError);
  });
});

// ==================== ApproveCommission ====================
describe("ApproveCommission", () => {
  it("deve aprovar comissão PENDING", async () => {
    const commRepo = makeCommissionRepo();
    const uc = new ApproveCommission(commRepo);
    await uc.execute("comm-1", "tenant-1", "admin-1", "ADMIN");
    expect(commRepo.updateStatus).toHaveBeenCalledWith("comm-1", expect.objectContaining({ status: "APPROVED" }));
  });

  it("deve rejeitar se não é ADMIN", async () => {
    const uc = new ApproveCommission(makeCommissionRepo());
    await expect(uc.execute("comm-1", "t", "u", "MECHANIC")).rejects.toThrow(ForbiddenError);
  });

  it("deve rejeitar se comissão não é PENDING", async () => {
    const commRepo = makeCommissionRepo({ findById: jest.fn().mockResolvedValue(makeCommission({ status: "PAID" })) });
    const uc = new ApproveCommission(commRepo);
    await expect(uc.execute("comm-1", "t", "u", "ADMIN")).rejects.toThrow(ValidationError);
  });

  it("deve rejeitar se comissão não encontrada", async () => {
    const commRepo = makeCommissionRepo({ findById: jest.fn().mockResolvedValue(null) });
    const uc = new ApproveCommission(commRepo);
    await expect(uc.execute("comm-1", "t", "u", "ADMIN")).rejects.toThrow(NotFoundError);
  });
});

// ==================== PayCommission ====================
describe("PayCommission", () => {
  it("deve pagar comissão APPROVED", async () => {
    const commRepo = makeCommissionRepo({ findById: jest.fn().mockResolvedValue(makeCommission({ status: "APPROVED" })) });
    const uc = new PayCommission(commRepo);
    await uc.execute("comm-1", "tenant-1", "admin-1", "ADMIN");
    expect(commRepo.updateStatus).toHaveBeenCalledWith("comm-1", expect.objectContaining({ status: "PAID" }));
  });

  it("deve rejeitar se não é ADMIN", async () => {
    const uc = new PayCommission(makeCommissionRepo());
    await expect(uc.execute("comm-1", "t", "u", "MECHANIC")).rejects.toThrow(ForbiddenError);
  });

  it("deve rejeitar se comissão não é APPROVED", async () => {
    const commRepo = makeCommissionRepo({ findById: jest.fn().mockResolvedValue(makeCommission({ status: "PENDING" })) });
    const uc = new PayCommission(commRepo);
    await expect(uc.execute("comm-1", "t", "u", "ADMIN")).rejects.toThrow(ValidationError);
  });
});

// ==================== CancelCommission ====================
describe("CancelCommission", () => {
  it("deve cancelar comissão PENDING com motivo", async () => {
    const commRepo = makeCommissionRepo();
    const uc = new CancelCommission(commRepo);
    await uc.execute("comm-1", { cancelReason: "Erro no período" }, "tenant-1", "admin-1", "ADMIN");
    expect(commRepo.updateStatus).toHaveBeenCalledWith("comm-1", expect.objectContaining({ status: "CANCELLED", cancelReason: "Erro no período" }));
  });

  it("deve rejeitar se não é ADMIN", async () => {
    const uc = new CancelCommission(makeCommissionRepo());
    await expect(uc.execute("comm-1", { cancelReason: "motivo" }, "t", "u", "MECHANIC")).rejects.toThrow(ForbiddenError);
  });

  it("deve rejeitar se motivo é curto", async () => {
    const uc = new CancelCommission(makeCommissionRepo());
    await expect(uc.execute("comm-1", { cancelReason: "ab" }, "t", "u", "ADMIN")).rejects.toThrow(ValidationError);
  });

  it("deve rejeitar se comissão já está PAID", async () => {
    const commRepo = makeCommissionRepo({ findById: jest.fn().mockResolvedValue(makeCommission({ status: "PAID" })) });
    const uc = new CancelCommission(commRepo);
    await expect(uc.execute("comm-1", { cancelReason: "motivo" }, "t", "u", "ADMIN")).rejects.toThrow(ValidationError);
  });

  it("deve cancelar comissão APPROVED", async () => {
    const commRepo = makeCommissionRepo({ findById: jest.fn().mockResolvedValue(makeCommission({ status: "APPROVED" })) });
    const uc = new CancelCommission(commRepo);
    await uc.execute("comm-1", { cancelReason: "Erro no cálculo" }, "t", "admin-1", "ADMIN");
    expect(commRepo.updateStatus).toHaveBeenCalled();
  });
});

// ==================== ListCommissions ====================
describe("ListCommissions", () => {
  it("ADMIN deve listar todas", async () => {
    const commRepo = makeCommissionRepo();
    const uc = new ListCommissions(commRepo);
    await uc.execute("tenant-1", "admin-1", "ADMIN", {});
    expect(commRepo.findAll).toHaveBeenCalledWith("tenant-1", {});
  });

  it("MECHANIC deve listar apenas suas", async () => {
    const commRepo = makeCommissionRepo();
    const uc = new ListCommissions(commRepo);
    await uc.execute("tenant-1", "mech-1", "MECHANIC", {});
    expect(commRepo.findByMechanic).toHaveBeenCalledWith("mech-1", "tenant-1", {});
  });

  it("ATTENDANT deve ser bloqueado", async () => {
    const uc = new ListCommissions(makeCommissionRepo());
    await expect(uc.execute("t", "u", "ATTENDANT", {})).rejects.toThrow(ForbiddenError);
  });
});

// ==================== GetCommissionDetail ====================
describe("GetCommissionDetail", () => {
  it("ADMIN pode ver qualquer comissão", async () => {
    const commRepo = makeCommissionRepo();
    const uc = new GetCommissionDetail(commRepo);
    const result = await uc.execute("comm-1", "tenant-1", "admin-1", "ADMIN");
    expect(result).toBeDefined();
  });

  it("MECHANIC pode ver sua própria comissão", async () => {
    const commRepo = makeCommissionRepo();
    const uc = new GetCommissionDetail(commRepo);
    const result = await uc.execute("comm-1", "tenant-1", "mech-1", "MECHANIC");
    expect(result).toBeDefined();
  });

  it("MECHANIC não pode ver comissão de outro", async () => {
    const commRepo = makeCommissionRepo({ findByIdWithItems: jest.fn().mockResolvedValue(makeCommission({ mechanicId: "mech-2" })) });
    const uc = new GetCommissionDetail(commRepo);
    await expect(uc.execute("comm-1", "t", "mech-1", "MECHANIC")).rejects.toThrow(ForbiddenError);
  });

  it("deve retornar 404 se não encontrada", async () => {
    const commRepo = makeCommissionRepo({ findByIdWithItems: jest.fn().mockResolvedValue(null) });
    const uc = new GetCommissionDetail(commRepo);
    await expect(uc.execute("comm-1", "t", "u", "ADMIN")).rejects.toThrow(NotFoundError);
  });
});

// ==================== GetMechanicCommissionSummary ====================
describe("GetMechanicCommissionSummary", () => {
  it("MECHANIC pode ver seu próprio resumo", async () => {
    const commRepo = makeCommissionRepo();
    const uc = new GetMechanicCommissionSummary(commRepo);
    const result = await uc.execute("mech-1", "tenant-1", "mech-1", "MECHANIC");
    expect(result.totalPending).toBe(100);
  });

  it("MECHANIC não pode ver resumo de outro", async () => {
    const uc = new GetMechanicCommissionSummary(makeCommissionRepo());
    await expect(uc.execute("mech-2", "t", "mech-1", "MECHANIC")).rejects.toThrow(ForbiddenError);
  });

  it("ADMIN pode ver resumo de qualquer mecânico", async () => {
    const commRepo = makeCommissionRepo();
    const uc = new GetMechanicCommissionSummary(commRepo);
    const result = await uc.execute("mech-1", "tenant-1", "admin-1", "ADMIN");
    expect(result.totalPaidAll).toBe(1000);
  });

  it("ATTENDANT é bloqueado", async () => {
    const uc = new GetMechanicCommissionSummary(makeCommissionRepo());
    await expect(uc.execute("mech-1", "t", "u", "ATTENDANT")).rejects.toThrow(ForbiddenError);
  });
});


// ==================== Cálculo de Comissão ====================
describe("GenerateCommission — cálculo de valores", () => {
  it("deve calcular commissionValue = price * rate / 100 para cada item", async () => {
    const services = [
      { id: "os-1", description: "Serviço A", price: 300, orderId: "o1", orderNumber: 1, clientName: "A", vehiclePlate: "X" },
      { id: "os-2", description: "Serviço B", price: 700, orderId: "o2", orderNumber: 2, clientName: "B", vehiclePlate: "Y" },
    ];
    const commRepo = makeCommissionRepo({ getEligibleServices: jest.fn().mockResolvedValue(services) });
    const userRepo = makeUserRepo({ findById: jest.fn().mockResolvedValue(makeMechanic({ commissionRate: 15 })) });
    const uc = new GenerateCommission(commRepo, userRepo);

    await uc.execute({ mechanicId: "mech-1", startDate: "2026-05-01", endDate: "2026-05-31" }, "tenant-1");

    expect(commRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      totalBase: 1000,
      totalCommission: 150,
      commissionRate: 15,
      items: expect.arrayContaining([
        expect.objectContaining({ orderServiceId: "os-1", baseValue: 300, commissionValue: 45 }),
        expect.objectContaining({ orderServiceId: "os-2", baseValue: 700, commissionValue: 105 }),
      ]),
    }));
  });

  it("deve arredondar commissionValue para 2 casas decimais", async () => {
    const services = [
      { id: "os-1", description: "Serviço", price: 333, orderId: "o1", orderNumber: 1, clientName: "A", vehiclePlate: "X" },
    ];
    const commRepo = makeCommissionRepo({ getEligibleServices: jest.fn().mockResolvedValue(services) });
    const userRepo = makeUserRepo({ findById: jest.fn().mockResolvedValue(makeMechanic({ commissionRate: 7 })) });
    const uc = new GenerateCommission(commRepo, userRepo);

    await uc.execute({ mechanicId: "mech-1", startDate: "2026-05-01", endDate: "2026-05-31" }, "tenant-1");

    const call = (commRepo.create as jest.Mock).mock.calls[0][0];
    // 333 * 7 / 100 = 23.31
    expect(call.items[0].commissionValue).toBeCloseTo(23.31, 2);
  });
});
