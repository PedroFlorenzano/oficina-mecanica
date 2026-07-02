import { CheckSubscription } from "@/application/use-cases/billing/CheckSubscription";
import { ProcessBillingWebhook } from "@/application/use-cases/billing/ProcessBillingWebhook";
import { ForbiddenError, ValidationError } from "@/domain/errors/DomainError";

// Mock PrismaClient
const makePrisma = (tenant: Record<string, unknown> | null = null) => ({
  tenant: {
    findUnique: jest.fn().mockResolvedValue(tenant),
    update: jest.fn().mockResolvedValue({}),
  },
} as unknown as import("@prisma/client").PrismaClient);

describe("CheckSubscription", () => {
  it("deve retornar dados do tenant ativo", async () => {
    const tenant = { plan: "professional", planExpiresAt: null, billingStatus: "active" };
    const db = makePrisma(tenant);
    const useCase = new CheckSubscription(db);

    const result = await useCase.execute("tenant-1");

    expect(result).toEqual(tenant);
  });

  it("deve lançar ForbiddenError se tenant não encontrado", async () => {
    const db = makePrisma(null);
    const useCase = new CheckSubscription(db);

    await expect(useCase.execute("inexistente")).rejects.toThrow(ForbiddenError);
  });

  it("deve lançar ForbiddenError se tenant suspenso", async () => {
    const db = makePrisma({ plan: "basic", planExpiresAt: null, billingStatus: "suspended" });
    const useCase = new CheckSubscription(db);

    await expect(useCase.execute("tenant-1")).rejects.toThrow(ForbiddenError);
    await expect(useCase.execute("tenant-1")).rejects.toThrow("suspensa");
  });

  it("deve lançar ForbiddenError se tenant cancelado", async () => {
    const db = makePrisma({ plan: "basic", planExpiresAt: null, billingStatus: "cancelled" });
    const useCase = new CheckSubscription(db);

    await expect(useCase.execute("tenant-1")).rejects.toThrow(ForbiddenError);
  });

  it("deve lançar ForbiddenError se trial expirado", async () => {
    const expired = new Date();
    expired.setDate(expired.getDate() - 1);
    const db = makePrisma({ plan: "trial", planExpiresAt: expired, billingStatus: "active" });
    const useCase = new CheckSubscription(db);

    await expect(useCase.execute("tenant-1")).rejects.toThrow(ForbiddenError);
    await expect(useCase.execute("tenant-1")).rejects.toThrow("expirou");
  });

  it("deve permitir trial ainda válido", async () => {
    const future = new Date();
    future.setDate(future.getDate() + 7);
    const tenant = { plan: "trial", planExpiresAt: future, billingStatus: "active" };
    const db = makePrisma(tenant);
    const useCase = new CheckSubscription(db);

    const result = await useCase.execute("tenant-1");
    expect(result.plan).toBe("trial");
  });

  it("deve permitir plano pago sem expiresAt", async () => {
    const tenant = { plan: "professional", planExpiresAt: null, billingStatus: "active" };
    const db = makePrisma(tenant);
    const useCase = new CheckSubscription(db);

    const result = await useCase.execute("tenant-1");
    expect(result.plan).toBe("professional");
  });
});

describe("ProcessBillingWebhook", () => {
  it("deve atualizar status para active em payment_confirmed", async () => {
    const db = makePrisma();
    const useCase = new ProcessBillingWebhook(db);

    await useCase.execute({
      event: "payment_confirmed",
      tenantId: "tenant-1",
      plan: "professional",
      expiresAt: "2027-01-01T00:00:00Z",
    });

    expect(db.tenant.update).toHaveBeenCalledWith({
      where: { id: "tenant-1" },
      data: expect.objectContaining({
        billingStatus: "active",
        plan: "professional",
      }),
    });
  });

  it("deve atualizar status para past_due em payment_overdue", async () => {
    const db = makePrisma();
    const useCase = new ProcessBillingWebhook(db);

    await useCase.execute({ event: "payment_overdue", tenantId: "tenant-1" });

    expect(db.tenant.update).toHaveBeenCalledWith({
      where: { id: "tenant-1" },
      data: { billingStatus: "past_due" },
    });
  });

  it("deve atualizar status para suspended em subscription_cancelled", async () => {
    const db = makePrisma();
    const useCase = new ProcessBillingWebhook(db);

    await useCase.execute({ event: "subscription_cancelled", tenantId: "tenant-1" });

    expect(db.tenant.update).toHaveBeenCalledWith({
      where: { id: "tenant-1" },
      data: { billingStatus: "suspended" },
    });
  });

  it("deve atualizar plano em subscription_upgraded", async () => {
    const db = makePrisma();
    const useCase = new ProcessBillingWebhook(db);

    await useCase.execute({
      event: "subscription_upgraded",
      tenantId: "tenant-1",
      plan: "enterprise",
    });

    expect(db.tenant.update).toHaveBeenCalledWith({
      where: { id: "tenant-1" },
      data: expect.objectContaining({
        billingStatus: "active",
        plan: "enterprise",
      }),
    });
  });

  it("deve lançar ValidationError se payload inválido", async () => {
    const db = makePrisma();
    const useCase = new ProcessBillingWebhook(db);

    await expect(
      useCase.execute({ event: "" as unknown as "payment_confirmed", tenantId: "" })
    ).rejects.toThrow(ValidationError);
  });

  it("deve ignorar evento desconhecido sem lançar erro", async () => {
    const db = makePrisma();
    const useCase = new ProcessBillingWebhook(db);

    await useCase.execute({ event: "unknown_event" as unknown as "payment_confirmed", tenantId: "tenant-1" });

    expect(db.tenant.update).not.toHaveBeenCalled();
  });

  it("deve atualizar planExpiresAt quando fornecido", async () => {
    const db = makePrisma();
    const useCase = new ProcessBillingWebhook(db);

    await useCase.execute({
      event: "subscription_renewed",
      tenantId: "tenant-1",
      expiresAt: "2027-06-01T00:00:00Z",
    });

    expect(db.tenant.update).toHaveBeenCalledWith({
      where: { id: "tenant-1" },
      data: expect.objectContaining({
        billingStatus: "active",
        planExpiresAt: new Date("2027-06-01T00:00:00Z"),
      }),
    });
  });
});
