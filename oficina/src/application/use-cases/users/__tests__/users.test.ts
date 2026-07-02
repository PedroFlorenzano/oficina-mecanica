import { LoginUser } from "@/application/use-cases/users/LoginUser";
import { CreateUser } from "@/application/use-cases/users/CreateUser";
import { ChangePassword } from "@/application/use-cases/users/ChangePassword";
import { IUserRepository, UserData } from "@/domain/repositories/IUserRepository";
import { AuthenticationError, ConflictError, NotFoundError, ValidationError } from "@/domain/errors/DomainError";
import bcrypt from "bcryptjs";

const makeUser = (overrides: Partial<UserData> = {}): UserData => ({
  id: "user-1",
  email: "admin@paiffer.com",
  password: bcrypt.hashSync("Abc12345", 10),
  name: "Admin Paiffer",
  role: "ADMIN",
  active: true,
  commissionRate: 0,
  customPermissions: null,
  tenantId: "tenant-1",
  failedLoginCount: 0,
  lockedUntil: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const makeUserRepo = (user: UserData | null = makeUser()): IUserRepository => ({
  findById: jest.fn().mockResolvedValue(user),
  findByEmail: jest.fn().mockResolvedValue(user),
  findAll: jest.fn().mockResolvedValue([]),
  create: jest.fn().mockImplementation((data) => Promise.resolve({ id: "new-user", createdAt: new Date(), updatedAt: new Date(), ...data })),
  update: jest.fn().mockImplementation((id, data) => Promise.resolve({ ...makeUser(), id, ...data })),
  incrementFailedLoginCount: jest.fn().mockResolvedValue(makeUser()),
  lockAccount: jest.fn().mockResolvedValue(makeUser()),
  resetLoginCounters: jest.fn().mockResolvedValue(makeUser()),
});

describe("LoginUser", () => {
  it("deve retornar payload de sessão para credenciais válidas", async () => {
    const repo = makeUserRepo();
    const useCase = new LoginUser(repo);

    const result = await useCase.execute("admin@paiffer.com", "Abc12345");

    expect(result).not.toBeNull();
    expect(result!.userId).toBe("user-1");
    expect(result!.tenantId).toBe("tenant-1");
    expect(result!.role).toBe("ADMIN");
    expect(repo.resetLoginCounters).toHaveBeenCalledWith("user-1");
  });

  it("deve retornar null se email não encontrado", async () => {
    const repo = makeUserRepo(null);
    (repo.findByEmail as jest.Mock).mockResolvedValue(null);
    const useCase = new LoginUser(repo);

    const result = await useCase.execute("inexistente@x.com", "Abc12345");
    expect(result).toBeNull();
  });

  it("deve retornar null se senha incorreta e incrementar contador", async () => {
    const repo = makeUserRepo();
    const useCase = new LoginUser(repo);

    const result = await useCase.execute("admin@paiffer.com", "SenhaErrada1");

    expect(result).toBeNull();
    expect(repo.incrementFailedLoginCount).toHaveBeenCalledWith("user-1");
  });

  it("deve bloquear conta após 5 tentativas falhas", async () => {
    const repo = makeUserRepo(makeUser({ failedLoginCount: 4 }));
    const useCase = new LoginUser(repo);

    await useCase.execute("admin@paiffer.com", "SenhaErrada1");

    expect(repo.lockAccount).toHaveBeenCalledWith("user-1", expect.any(Date));
  });

  it("deve lançar AuthenticationError se conta bloqueada", async () => {
    const future = new Date(Date.now() + 60000);
    const repo = makeUserRepo(makeUser({ lockedUntil: future }));
    const useCase = new LoginUser(repo);

    await expect(
      useCase.execute("admin@paiffer.com", "Abc12345")
    ).rejects.toThrow(AuthenticationError);
  });

  it("deve retornar null se usuário inativo", async () => {
    const repo = makeUserRepo(makeUser({ active: false }));
    const useCase = new LoginUser(repo);

    const result = await useCase.execute("admin@paiffer.com", "Abc12345");
    expect(result).toBeNull();
  });
});

describe("CreateUser", () => {
  it("deve criar usuário com dados válidos", async () => {
    const repo = makeUserRepo();
    (repo.findByEmail as jest.Mock).mockResolvedValue(null);
    const useCase = new CreateUser(repo);

    const result = await useCase.execute(
      { name: "Novo Mecânico", email: "mecanico@test.com", role: "MECHANIC", password: "Abc12345", commissionRate: 15 },
      "tenant-1",
      "admin-user"
    );

    expect(result.id).toBe("new-user");
    expect(result.email).toBe("mecanico@test.com");
    expect(result.role).toBe("MECHANIC");
    expect(repo.create).toHaveBeenCalled();
  });

  it("deve lançar ValidationError se nome curto", async () => {
    const repo = makeUserRepo();
    const useCase = new CreateUser(repo);

    await expect(
      useCase.execute(
        { name: "Ab", email: "a@b.com", role: "MECHANIC", password: "Abc12345" },
        "tenant-1", "admin"
      )
    ).rejects.toThrow(ValidationError);
  });

  it("deve lançar ValidationError se email inválido", async () => {
    const repo = makeUserRepo();
    const useCase = new CreateUser(repo);

    await expect(
      useCase.execute(
        { name: "Novo User", email: "invalid-email", role: "MECHANIC", password: "Abc12345" },
        "tenant-1", "admin"
      )
    ).rejects.toThrow(ValidationError);
  });

  it("deve lançar ValidationError se senha fraca", async () => {
    const repo = makeUserRepo();
    const useCase = new CreateUser(repo);

    await expect(
      useCase.execute(
        { name: "Novo User", email: "user@test.com", role: "MECHANIC", password: "123" },
        "tenant-1", "admin"
      )
    ).rejects.toThrow(ValidationError);
  });

  it("deve lançar ConflictError se email já existe no tenant", async () => {
    const repo = makeUserRepo(makeUser({ tenantId: "tenant-1" }));
    const useCase = new CreateUser(repo);

    await expect(
      useCase.execute(
        { name: "Duplicado", email: "admin@paiffer.com", role: "MECHANIC", password: "Abc12345" },
        "tenant-1", "admin"
      )
    ).rejects.toThrow(ConflictError);
  });

  it("deve permitir mesmo email em tenant diferente", async () => {
    const repo = makeUserRepo(makeUser({ tenantId: "outro-tenant" }));
    const useCase = new CreateUser(repo);

    const result = await useCase.execute(
      { name: "Mesmo Email", email: "admin@paiffer.com", role: "ADMIN", password: "Abc12345" },
      "tenant-1", "admin"
    );

    expect(result.id).toBe("new-user");
  });

  it("deve definir commissionRate para mecânico", async () => {
    const repo = makeUserRepo();
    (repo.findByEmail as jest.Mock).mockResolvedValue(null);
    const useCase = new CreateUser(repo);

    await useCase.execute(
      { name: "Mecânico", email: "mec@test.com", role: "MECHANIC", password: "Abc12345", commissionRate: 20 },
      "tenant-1", "admin"
    );

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ commissionRate: 20 })
    );
  });
});

describe("ChangePassword", () => {
  it("deve alterar senha com senha atual correta", async () => {
    const repo = makeUserRepo();
    const useCase = new ChangePassword(repo);

    await useCase.execute("user-1", "Abc12345", "NewPass123", "tenant-1");

    expect(repo.update).toHaveBeenCalledWith("user-1", expect.objectContaining({ password: expect.any(String) }));
    expect(repo.resetLoginCounters).toHaveBeenCalledWith("user-1");
  });

  it("deve lançar NotFoundError se usuário não existe", async () => {
    const repo = makeUserRepo(null);
    (repo.findById as jest.Mock).mockResolvedValue(null);
    const useCase = new ChangePassword(repo);

    await expect(
      useCase.execute("inexistente", "Abc12345", "NewPass123", "tenant-1")
    ).rejects.toThrow(NotFoundError);
  });

  it("deve lançar ValidationError se senha atual incorreta", async () => {
    const repo = makeUserRepo();
    const useCase = new ChangePassword(repo);

    await expect(
      useCase.execute("user-1", "SenhaErrada9", "NewPass123", "tenant-1")
    ).rejects.toThrow(ValidationError);
  });

  it("deve lançar ValidationError se nova senha fraca", async () => {
    const repo = makeUserRepo();
    const useCase = new ChangePassword(repo);

    await expect(
      useCase.execute("user-1", "Abc12345", "123", "tenant-1")
    ).rejects.toThrow(ValidationError);
  });
});
