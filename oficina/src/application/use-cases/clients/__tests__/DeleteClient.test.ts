import { DeleteClient } from "@/application/use-cases/clients/DeleteClient";
import { IClientRepository, ClientData } from "@/domain/repositories/IClientRepository";
import { NotFoundError, ConflictError } from "@/domain/errors/DomainError";

const makeClient = (overrides: Partial<ClientData> = {}): ClientData => ({
  id: "client-1",
  name: "João Silva",
  document: "123.456.789-00",
  docType: "CPF",
  phone: null,
  email: null,
  address: null,
  active: true,
  tenantId: "tenant-1",
  ...overrides,
});

const makeRepo = (client: ClientData | null = makeClient()): IClientRepository => ({
  findById: jest.fn().mockResolvedValue(client),
  findByDocument: jest.fn(),
  search: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  deactivate: jest.fn().mockResolvedValue({ ...makeClient(), active: false }),
});

describe("DeleteClient", () => {
  it("deve inativar cliente ativo com sucesso", async () => {
    const repo = makeRepo();
    const useCase = new DeleteClient(repo);

    const result = await useCase.execute("client-1", "tenant-1");

    expect(result).toEqual({ success: true });
    expect(repo.deactivate).toHaveBeenCalledWith("client-1");
  });

  it("deve lançar NotFoundError quando cliente não existe", async () => {
    const repo = makeRepo(null);
    const useCase = new DeleteClient(repo);

    await expect(useCase.execute("inexistente", "tenant-1")).rejects.toThrow(NotFoundError);
    await expect(useCase.execute("inexistente", "tenant-1")).rejects.toThrow("Cliente não encontrado");
  });

  it("deve lançar ConflictError quando cliente já está inativo", async () => {
    const repo = makeRepo(makeClient({ active: false }));
    const useCase = new DeleteClient(repo);

    await expect(useCase.execute("client-1", "tenant-1")).rejects.toThrow(ConflictError);
    await expect(useCase.execute("client-1", "tenant-1")).rejects.toThrow("Cliente já está inativo");
  });

  it("não deve chamar deactivate se cliente não existe", async () => {
    const repo = makeRepo(null);
    const useCase = new DeleteClient(repo);

    await expect(useCase.execute("inexistente", "tenant-1")).rejects.toThrow();
    expect(repo.deactivate).not.toHaveBeenCalled();
  });
});
