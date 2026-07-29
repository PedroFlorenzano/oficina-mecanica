import { ImportClients } from "@/application/use-cases/import/ImportClients";
import { ImportVehicles } from "@/application/use-cases/import/ImportVehicles";
import { ImportStock } from "@/application/use-cases/import/ImportStock";
import { ImportServices } from "@/application/use-cases/import/ImportServices";

// ==========================================
// Mock repositories
// ==========================================

function createMockClientRepo() {
  const store: Record<string, { id: string; name: string; document: string; docType: string }> = {};
  return {
    findByDocument: jest.fn(async (doc: string) => store[doc] || null),
    findAll: jest.fn(async () => Object.values(store)),
    create: jest.fn(async (data: Record<string, unknown>) => {
      const id = `client-${Object.keys(store).length + 1}`;
      const record = { id, ...data } as { id: string; name: string; document: string; docType: string };
      store[data.document as string] = record;
      return record;
    }),
    update: jest.fn(async (id: string, data: Record<string, unknown>) => {
      const existing = Object.values(store).find((c) => c.id === id);
      if (existing) Object.assign(existing, data);
      return existing;
    }),
  };
}

function createMockVehicleRepo() {
  const store: Record<string, { id: string; plate: string }> = {};
  return {
    findByPlate: jest.fn(async (plate: string) => store[plate] || null),
    create: jest.fn(async (data: Record<string, unknown>) => {
      const id = `vehicle-${Object.keys(store).length + 1}`;
      const record = { id, ...data } as { id: string; plate: string };
      store[data.plate as string] = record;
      return record;
    }),
    update: jest.fn(async (id: string, data: Record<string, unknown>) => {
      const existing = Object.values(store).find((v) => v.id === id);
      if (existing) Object.assign(existing, data);
      return existing;
    }),
  };
}

function createMockStockRepo() {
  const store: Record<string, { id: string; code: string }> = {};
  return {
    findByCode: jest.fn(async (code: string) => store[code] || null),
    create: jest.fn(async (data: Record<string, unknown>) => {
      const id = `stock-${Object.keys(store).length + 1}`;
      const record = { id, ...data } as { id: string; code: string };
      store[data.code as string] = record;
      return record;
    }),
    update: jest.fn(async (id: string, data: Record<string, unknown>) => {
      const existing = Object.values(store).find((s) => s.id === id);
      if (existing) Object.assign(existing, data);
      return existing;
    }),
  };
}

function createMockServiceRepo() {
  const store: Record<string, { id: string; code: string }> = {};
  return {
    findByCode: jest.fn(async (code: string) => store[code] || null),
    create: jest.fn(async (data: Record<string, unknown>) => {
      const id = `svc-${Object.keys(store).length + 1}`;
      const record = { id, ...data } as { id: string; code: string };
      store[data.code as string] = record;
      return record;
    }),
    update: jest.fn(async (id: string, data: Record<string, unknown>) => {
      const existing = Object.values(store).find((s) => s.id === id);
      if (existing) Object.assign(existing, data);
      return existing;
    }),
  };
}

// ==========================================
// Helper - build HTML-as-XLS buffer
// ==========================================

function buildHtmlXls(headers: string[], rows: string[][]): Buffer {
  const headerRow = `<tr>${headers.map((h) => `<td>${h}</td>`).join("")}</tr>`;
  const dataRows = rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("");
  return Buffer.from(`<html><body>${headerRow}${dataRows}</body></html>`, "latin1");
}

// ==========================================
// ImportClients Tests
// ==========================================

describe("ImportClients", () => {
  it("should import new clients from HTML-XLS", async () => {
    const repo = createMockClientRepo();
    const uc = new ImportClients(repo as never);

    const buffer = buildHtmlXls(
      ["Nome", "CNPJ", "Celular", "Email", "Endereço", "Tipo", "Status"],
      [
        ["JOÃO SILVA", "123.456.789-01", "(15) 99999-0000", "joao@test.com", "Rua A, 123", "Cliente", "Ativo"],
        ["EMPRESA LTDA", "12.345.678/0001-90", "", "", "Av B, 456", "Cliente", "Ativo"],
        ["FORNECEDOR X", "11.222.333/0001-44", "", "", "", "Fornecedor", "Ativo"],
      ]
    );

    const result = await uc.execute({
      buffer,
      filename: "clientes.xls",
      tenantId: "tenant-1",
    });

    expect(result.imported).toBe(2);
    expect(result.skipped).toBe(1); // Fornecedor
    expect(repo.create).toHaveBeenCalledTimes(2);
  });

  it("should skip duplicates by default", async () => {
    const repo = createMockClientRepo();
    // Pre-populate one client
    repo.findByDocument.mockResolvedValueOnce({ id: "existing-1", name: "JOÃO", document: "12345678901", docType: "CPF" });
    const uc = new ImportClients(repo as never);

    const buffer = buildHtmlXls(
      ["Nome", "CNPJ", "Tipo", "Status"],
      [["JOÃO SILVA", "123.456.789-01", "Cliente", "Ativo"]]
    );

    const result = await uc.execute({
      buffer,
      filename: "clientes.xls",
      tenantId: "tenant-1",
      skipDuplicates: true,
    });

    expect(result.imported).toBe(0);
    expect(result.skipped).toBe(1);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("should update duplicates when skipDuplicates=false", async () => {
    const repo = createMockClientRepo();
    repo.findByDocument.mockResolvedValueOnce({ id: "existing-1", name: "JOÃO", document: "12345678901", docType: "CPF" });
    const uc = new ImportClients(repo as never);

    const buffer = buildHtmlXls(
      ["Nome", "CNPJ", "Tipo", "Status"],
      [["JOÃO SILVA ATUALIZADO", "123.456.789-01", "Cliente", "Ativo"]]
    );

    const result = await uc.execute({
      buffer,
      filename: "clientes.xls",
      tenantId: "tenant-1",
      skipDuplicates: false,
    });

    expect(result.updated).toBe(1);
    expect(result.imported).toBe(0);
    expect(repo.update).toHaveBeenCalledWith("existing-1", expect.objectContaining({
      name: "JOÃO SILVA ATUALIZADO",
    }));
  });

  it("should return errors for invalid rows without stopping", async () => {
    const repo = createMockClientRepo();
    const uc = new ImportClients(repo as never);

    const buffer = buildHtmlXls(
      ["Nome", "CNPJ", "Tipo"],
      [
        ["", "123.456.789-01", "Cliente"], // no name
        ["MARIA", "", "Cliente"], // no doc
        ["PEDRO", "12345", "Cliente"], // invalid doc
        ["ANA", "111.222.333-44", "Cliente"], // valid
      ]
    );

    const result = await uc.execute({
      buffer,
      filename: "clientes.xls",
      tenantId: "tenant-1",
    });

    expect(result.imported).toBe(1); // only ANA
    expect(result.errors.length).toBe(3);
  });
});

// ==========================================
// ImportVehicles Tests
// ==========================================

describe("ImportVehicles", () => {
  it("should import vehicles and link to existing clients", async () => {
    const vehicleRepo = createMockVehicleRepo();
    const clientRepo = createMockClientRepo();
    clientRepo.findAll.mockResolvedValue([
      { id: "c1", name: "FERNANDA PAIFFER", document: "12345678901", docType: "CPF" },
    ]);

    const uc = new ImportVehicles(vehicleRepo as never, clientRepo as never);
    const buffer = buildHtmlXls(
      ["Placa", "Marca", "Modelo", "Ano", "Cliente"],
      [["RUM7J67", "CITROEN", "C4CACTUS", "2022 - 2023", "FERNANDA PAIFFER"]]
    );

    const result = await uc.execute({
      buffer,
      filename: "veiculos.xls",
      tenantId: "tenant-1",
    });

    expect(result.imported).toBe(1);
    expect(vehicleRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        plate: "RUM7J67",
        brand: "CITROEN",
        model: "C4CACTUS",
        year: 2022,
        yearModel: 2023,
        clientId: "c1",
      })
    );
  });

  it("should error when client not found", async () => {
    const vehicleRepo = createMockVehicleRepo();
    const clientRepo = createMockClientRepo();
    clientRepo.findAll.mockResolvedValue([]);

    const uc = new ImportVehicles(vehicleRepo as never, clientRepo as never);
    const buffer = buildHtmlXls(
      ["Placa", "Marca", "Modelo", "Cliente"],
      [["ABC1234", "FORD", "KA", "CLIENTE INEXISTENTE"]]
    );

    const result = await uc.execute({
      buffer,
      filename: "veiculos.xls",
      tenantId: "tenant-1",
    });

    expect(result.imported).toBe(0);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].message).toContain("não encontrado");
  });
});

// ==========================================
// ImportStock Tests
// ==========================================

describe("ImportStock", () => {
  it("should import stock items", async () => {
    const repo = createMockStockRepo();
    const uc = new ImportStock(repo as never);

    const buffer = buildHtmlXls(
      ["Código", "Referência", "Marca", "Unidade", "Descrição", "NCM", "Estoque", "Custo Unitário"],
      [
        ["1", "MN7511", "MANNOL", "L", "OLEO 5W-30", "27101932", "83", "23.89"],
        ["2", "HU711", "MANN", "PC", "FILTRO OLEO", "84219999", "8", "18.19"],
      ]
    );

    const result = await uc.execute({
      buffer,
      filename: "estoque.xls",
      tenantId: "tenant-1",
    });

    expect(result.imported).toBe(2);
    expect(repo.create).toHaveBeenCalledTimes(2);
  });

  it("should skip duplicates", async () => {
    const repo = createMockStockRepo();
    repo.findByCode.mockResolvedValueOnce({ id: "s1", code: "1" });
    const uc = new ImportStock(repo as never);

    const buffer = buildHtmlXls(
      ["Código", "Descrição", "Estoque", "Custo Unitário"],
      [["1", "OLEO", "10", "20"]]
    );

    const result = await uc.execute({
      buffer,
      filename: "estoque.xls",
      tenantId: "tenant-1",
    });

    expect(result.imported).toBe(0);
    expect(result.skipped).toBe(1);
  });
});

// ==========================================
// ImportServices Tests
// ==========================================

describe("ImportServices", () => {
  it("should import services", async () => {
    const repo = createMockServiceRepo();
    const uc = new ImportServices(repo as never);

    const buffer = buildHtmlXls(
      ["Código Interno", "Descrição", "Custo do Serviço", "Valor do Serviço"],
      [
        ["1", "ALINHAMENTO", "R$ 0,00", "R$ 100,00"],
        ["2", "BALANCEAMENTO", "R$ 0,00", "R$ 80,00"],
      ]
    );

    const result = await uc.execute({
      buffer,
      filename: "servicos.xls",
      tenantId: "tenant-1",
    });

    expect(result.imported).toBe(2);
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "1",
        description: "ALINHAMENTO",
        defaultPrice: 100,
      })
    );
  });

  it("should handle empty file", async () => {
    const repo = createMockServiceRepo();
    const uc = new ImportServices(repo as never);

    const buffer = Buffer.from("", "utf8");
    const result = await uc.execute({
      buffer,
      filename: "vazio.csv",
      tenantId: "tenant-1",
    });

    expect(result.imported).toBe(0);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].message).toContain("vazio");
  });
});
