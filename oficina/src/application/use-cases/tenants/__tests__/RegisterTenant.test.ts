import { RegisterTenant } from "@/application/use-cases/tenants/RegisterTenant";
import { ValidationError, ConflictError } from "@/domain/errors/DomainError";

const makePrisma = (existingTenant: any = null, existingUser: any = null) => ({
  tenant: {
    findUnique: jest.fn().mockResolvedValue(existingTenant),
    create: jest.fn().mockImplementation((args) => Promise.resolve({
      id: "new-tenant",
      name: args.data.name,
      slug: args.data.slug,
      ...args.data,
    })),
  },
  user: {
    findUnique: jest.fn().mockResolvedValue(existingUser),
  },
} as any);

const validInput = {
  officeName: "Oficina Teste LTDA",
  cnpj: "11.222.333/0001-81",
  adminName: "Admin Teste",
  adminEmail: "admin@teste.com",
  adminPassword: "Abc12345",
  phone: "(15) 3333-4444",
  address: "Rua das Flores, 123",
};

describe("RegisterTenant", () => {
  it("deve registrar tenant com dados válidos", async () => {
    const db = makePrisma();
    const useCase = new RegisterTenant(db);

    const result = await useCase.execute(validInput);

    expect(result.tenantId).toBe("new-tenant");
    expect(result.tenantName).toBe("Oficina Teste LTDA");
    expect(result.adminEmail).toBe("admin@teste.com");
    expect(db.tenant.create).toHaveBeenCalled();
  });

  it("deve lançar ValidationError se nome da oficina curto", async () => {
    const db = makePrisma();
    const useCase = new RegisterTenant(db);

    await expect(
      useCase.execute({ ...validInput, officeName: "AB" })
    ).rejects.toThrow(ValidationError);
  });

  it("deve lançar ValidationError se nome vazio", async () => {
    const db = makePrisma();
    const useCase = new RegisterTenant(db);

    await expect(
      useCase.execute({ ...validInput, officeName: "" })
    ).rejects.toThrow(ValidationError);
  });

  it("deve lançar ValidationError se CNPJ inválido", async () => {
    const db = makePrisma();
    const useCase = new RegisterTenant(db);

    await expect(
      useCase.execute({ ...validInput, cnpj: "00.000.000/0000-00" })
    ).rejects.toThrow(ValidationError);
  });

  it("deve lançar ValidationError se email inválido", async () => {
    const db = makePrisma();
    const useCase = new RegisterTenant(db);

    await expect(
      useCase.execute({ ...validInput, adminEmail: "invalid" })
    ).rejects.toThrow(ValidationError);
  });

  it("deve lançar ValidationError se senha fraca", async () => {
    const db = makePrisma();
    const useCase = new RegisterTenant(db);

    await expect(
      useCase.execute({ ...validInput, adminPassword: "123" })
    ).rejects.toThrow(ValidationError);
  });

  it("deve lançar ValidationError se nome do admin curto", async () => {
    const db = makePrisma();
    const useCase = new RegisterTenant(db);

    await expect(
      useCase.execute({ ...validInput, adminName: "Ab" })
    ).rejects.toThrow(ValidationError);
  });

  it("deve lançar ConflictError se CNPJ já cadastrado", async () => {
    const db = makePrisma({ id: "existing-tenant" });
    const useCase = new RegisterTenant(db);

    await expect(
      useCase.execute(validInput)
    ).rejects.toThrow(ConflictError);
  });

  it("deve lançar ConflictError se email já em uso", async () => {
    const db = makePrisma(null, { id: "existing-user" });
    const useCase = new RegisterTenant(db);

    await expect(
      useCase.execute(validInput)
    ).rejects.toThrow(ConflictError);
  });

  it("deve criar tenant com plano trial e expiração de 15 dias", async () => {
    const db = makePrisma();
    const useCase = new RegisterTenant(db);

    await useCase.execute(validInput);

    expect(db.tenant.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          plan: "trial",
          billingStatus: "active",
        }),
      })
    );
  });

  it("deve gerar slug a partir do nome da oficina", async () => {
    const db = makePrisma();
    const useCase = new RegisterTenant(db);

    await useCase.execute({ ...validInput, officeName: "Oficina São Paulo Ç" });

    expect(db.tenant.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          slug: expect.stringMatching(/^oficina-sao-paulo-c/),
        }),
      })
    );
  });
});
