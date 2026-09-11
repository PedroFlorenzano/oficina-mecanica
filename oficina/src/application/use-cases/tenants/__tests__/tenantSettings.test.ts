import { GetTenantSettings, DEFAULT_TENANT_SETTINGS } from "@/application/use-cases/tenants/GetTenantSettings";
import { UpdateTenantSettings } from "@/application/use-cases/tenants/UpdateTenantSettings";
import {
  ITenantSettingsRepository,
  TenantSettingsData,
} from "@/domain/repositories/ITenantSettingsRepository";
import { ForbiddenError, ValidationError } from "@/domain/errors/DomainError";

const makeSettings = (overrides: Partial<TenantSettingsData> = {}): TenantSettingsData => ({
  id: "settings-1",
  tenantId: "tenant-1",
  allowEditInProgress: true,
  uppercaseInputs: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const makeRepo = (overrides: Partial<ITenantSettingsRepository> = {}): ITenantSettingsRepository => ({
  get: jest.fn().mockResolvedValue(makeSettings()),
  upsert: jest.fn().mockResolvedValue(makeSettings()),
  ...overrides,
});

describe("GetTenantSettings", () => {
  it("retorna os valores existentes quando há linha", async () => {
    const repo = makeRepo({
      get: jest.fn().mockResolvedValue(
        makeSettings({ allowEditInProgress: true, uppercaseInputs: false })
      ),
    });
    const useCase = new GetTenantSettings(repo);

    const result = await useCase.execute("tenant-1");

    expect(result).toEqual({ allowEditInProgress: true, uppercaseInputs: false });
    expect(repo.get).toHaveBeenCalledWith("tenant-1");
  });

  it("retorna os defaults SEM gravar quando não há linha", async () => {
    const repo = makeRepo({ get: jest.fn().mockResolvedValue(null) });
    const useCase = new GetTenantSettings(repo);

    const result = await useCase.execute("tenant-1");

    expect(result).toEqual({ ...DEFAULT_TENANT_SETTINGS });
    expect(repo.upsert).not.toHaveBeenCalled();
  });

  it("filtra pelo tenantId recebido", async () => {
    const repo = makeRepo({ get: jest.fn().mockResolvedValue(null) });
    const useCase = new GetTenantSettings(repo);

    await useCase.execute("tenant-xyz");

    expect(repo.get).toHaveBeenCalledWith("tenant-xyz");
  });
});

describe("UpdateTenantSettings", () => {
  it("bloqueia não-ADMIN com ForbiddenError", async () => {
    const repo = makeRepo();
    const useCase = new UpdateTenantSettings(repo);

    await expect(
      useCase.execute({ uppercaseInputs: true }, "tenant-1", "MECHANIC")
    ).rejects.toBeInstanceOf(ForbiddenError);
    await expect(
      useCase.execute({ uppercaseInputs: true }, "tenant-1", "ATTENDANT")
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(repo.upsert).not.toHaveBeenCalled();
  });

  it("faz upsert com o tenantId da sessão e retorna os valores salvos", async () => {
    const repo = makeRepo({
      upsert: jest.fn().mockResolvedValue(
        makeSettings({ allowEditInProgress: false, uppercaseInputs: true })
      ),
    });
    const useCase = new UpdateTenantSettings(repo);

    const result = await useCase.execute(
      { allowEditInProgress: false, uppercaseInputs: true },
      "tenant-1",
      "ADMIN"
    );

    expect(repo.upsert).toHaveBeenCalledWith("tenant-1", {
      allowEditInProgress: false,
      uppercaseInputs: true,
    });
    expect(result).toEqual({ allowEditInProgress: false, uppercaseInputs: true });
  });

  it("ignora campos não enviados (partial update)", async () => {
    const repo = makeRepo();
    const useCase = new UpdateTenantSettings(repo);

    await useCase.execute({ uppercaseInputs: true }, "tenant-1", "ADMIN");

    expect(repo.upsert).toHaveBeenCalledWith("tenant-1", { uppercaseInputs: true });
  });

  it("rejeita valor não-booleano com ValidationError", async () => {
    const repo = makeRepo();
    const useCase = new UpdateTenantSettings(repo);

    await expect(
      useCase.execute(
        { uppercaseInputs: "sim" as unknown as boolean },
        "tenant-1",
        "ADMIN"
      )
    ).rejects.toBeInstanceOf(ValidationError);
    expect(repo.upsert).not.toHaveBeenCalled();
  });
});
