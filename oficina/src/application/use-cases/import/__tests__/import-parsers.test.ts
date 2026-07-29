import { FileParser } from "@/application/use-cases/import/parsers/FileParser";
import { ClientMapper, VehicleMapper, StockItemMapper, ServiceMapper } from "@/application/use-cases/import/parsers/DataMappers";

// ==========================================
// FileParser Tests
// ==========================================

describe("FileParser", () => {
  describe("detectFormat and parse", () => {
    it("should parse CSV content", () => {
      const csv = Buffer.from(
        "Nome;CPF;Telefone\nJoão Silva;123.456.789-01;(11) 99999-0000\nMaria;987.654.321-00;(15) 98888-1111",
        "utf8"
      );
      const result = FileParser.parse(csv, "clientes.csv");
      expect(result.format).toBe("csv");
      expect(result.rows.length).toBe(2);
    });

    it("should detect HTML-as-XLS format", () => {
      const html = Buffer.from(
        `<html><head></head><body>
        <tr><td>Nome</td><td>CPF</td><td>Tipo</td></tr>
        <tr><td>João</td><td>123.456.789-01</td><td>Cliente</td></tr>
        </body></html>`,
        "latin1"
      );
      const result = FileParser.parse(html, "clientes.xls");
      expect(result.format).toBe("html-xls");
      expect(result.headers).toContain("Nome");
      expect(result.rows.length).toBe(1);
    });

    it("should handle empty file gracefully", () => {
      const empty = Buffer.from("<html></html>", "latin1");
      const result = FileParser.parse(empty, "empty.xls");
      expect(result.rows.length).toBe(0);
    });

    it("should strip HTML tags from cell values", () => {
      const html = Buffer.from(
        `<html><body>
        <tr><td>Nome</td><td>Status</td></tr>
        <tr><td><b>João</b></td><td>Ativo</td></tr>
        </body></html>`,
        "latin1"
      );
      const result = FileParser.parse(html, "test.xls");
      expect(result.rows[0]["Nome"]).toBe("João");
    });
  });

  describe("fixEncoding", () => {
    it("should clean common garbled strings", () => {
      expect(FileParser.fixEncoding("Descrição")).toBe("Descrição");
    });
  });
});

// ==========================================
// ClientMapper Tests
// ==========================================

describe("ClientMapper", () => {
  it("should map valid client rows", () => {
    const rows = [
      { Nome: "JOÃO SILVA", CNPJ: "123.456.789-01", Celular: "(15) 99999-0000", Email: "joao@test.com", Endereço: "Rua A, 123", Tipo: "Cliente", Status: "Ativo" },
      { Nome: "EMPRESA LTDA", CNPJ: "12.345.678/0001-90", Celular: null, Email: null, Endereço: "Av B, 456", Tipo: "Cliente", Status: "Ativo" },
    ];
    const result = ClientMapper.map(rows);
    expect(result.success.length).toBe(2);
    expect(result.success[0].document).toBe("12345678901");
    expect(result.success[0].docType).toBe("CPF");
    expect(result.success[1].document).toBe("12345678000190");
    expect(result.success[1].docType).toBe("CNPJ");
  });

  it("should skip non-client rows (Fornecedor)", () => {
    const rows = [
      { Nome: "FORNECEDOR X", CNPJ: "12.345.678/0001-90", Tipo: "Fornecedor", Status: "Ativo" },
    ];
    const result = ClientMapper.map(rows);
    expect(result.success.length).toBe(0);
    expect(result.skipped.length).toBe(1);
    expect(result.skipped[0].reason).toContain("Fornecedor");
  });

  it("should error on missing name", () => {
    const rows = [{ Nome: "", CNPJ: "123.456.789-01", Tipo: "Cliente" }];
    const result = ClientMapper.map(rows);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].message).toContain("Nome");
  });

  it("should error on missing document", () => {
    const rows = [{ Nome: "João", CNPJ: "", Tipo: "Cliente" }];
    const result = ClientMapper.map(rows);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].message).toContain("Documento");
  });

  it("should error on invalid document length", () => {
    const rows = [{ Nome: "João", CNPJ: "12345", Tipo: "Cliente" }];
    const result = ClientMapper.map(rows);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].message).toContain("inválido");
  });

  it("should handle rows without Tipo field (assume Cliente)", () => {
    const rows = [{ Nome: "João", CNPJ: "123.456.789-01", Status: "Ativo" }];
    const result = ClientMapper.map(rows);
    expect(result.success.length).toBe(1);
  });
});

// ==========================================
// VehicleMapper Tests
// ==========================================

describe("VehicleMapper", () => {
  it("should map valid vehicle rows", () => {
    const rows = [
      { Placa: "RUM7J67", Marca: "CITROEN", Modelo: "C4CACTUS", Ano: "2022 - 2023", Cliente: "FERNANDA PAIFFER" },
    ];
    const result = VehicleMapper.map(rows);
    expect(result.success.length).toBe(1);
    expect(result.success[0].plate).toBe("RUM7J67");
    expect(result.success[0].year).toBe(2022);
    expect(result.success[0].yearModel).toBe(2023);
    expect(result.success[0].clientName).toBe("FERNANDA PAIFFER");
  });

  it("should error on missing plate", () => {
    const rows = [{ Placa: "", Marca: "FORD", Cliente: "João" }];
    const result = VehicleMapper.map(rows);
    expect(result.errors.length).toBe(1);
  });

  it("should error on short plate", () => {
    const rows = [{ Placa: "ABC", Marca: "FORD", Cliente: "João" }];
    const result = VehicleMapper.map(rows);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].message).toContain("inválida");
  });

  it("should error on missing client name", () => {
    const rows = [{ Placa: "ABC1234", Marca: "FORD", Modelo: "KA", Cliente: "" }];
    const result = VehicleMapper.map(rows);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].message).toContain("proprietário");
  });

  it("should parse single year", () => {
    const rows = [{ Placa: "ABC1234", Marca: "FORD", Modelo: "KA", Ano: "2019", Cliente: "João" }];
    const result = VehicleMapper.map(rows);
    expect(result.success[0].year).toBe(2019);
    expect(result.success[0].yearModel).toBeNull();
  });

  it("should use default brand and model when missing", () => {
    const rows = [{ Placa: "ABC1234", Cliente: "João" }];
    const result = VehicleMapper.map(rows);
    expect(result.success[0].brand).toBe("N/I");
    expect(result.success[0].model).toBe("N/I");
  });
});

// ==========================================
// StockItemMapper Tests
// ==========================================

describe("StockItemMapper", () => {
  it("should map valid stock items", () => {
    const rows = [
      { "Código": 1, "Referência": "MN7511-208", Marca: "MANNOL", Unidade: "L", "Descrição": "OLEO MOTOR 5W-30", NCM: 27101932, Estoque: 83.5, "Custo Unitário": 23.89, "Custo Total": 1994.815 },
    ];
    const result = StockItemMapper.map(rows);
    expect(result.success.length).toBe(1);
    expect(result.success[0].code).toBe("1");
    expect(result.success[0].reference).toBe("MN7511-208");
    expect(result.success[0].quantity).toBe(84); // rounded
    expect(result.success[0].costPrice).toBe(23.89);
    expect(result.success[0].unit).toBe("L");
  });

  it("should error on missing code", () => {
    const rows = [{ "Código": null, "Descrição": "Item sem código" }];
    const result = StockItemMapper.map(rows);
    expect(result.errors.length).toBe(1);
  });

  it("should error on missing description", () => {
    const rows = [{ "Código": 1, "Descrição": "" }];
    const result = StockItemMapper.map(rows);
    expect(result.errors.length).toBe(1);
  });

  it("should handle negative stock as 0", () => {
    const rows = [{ "Código": 1, "Descrição": "RETIFICA", Estoque: -2, "Custo Unitário": 0 }];
    const result = StockItemMapper.map(rows);
    expect(result.success[0].quantity).toBe(0);
  });

  it("should parse R$ formatted cost", () => {
    const rows = [{ "Código": 1, "Descrição": "ITEM", Estoque: 5, "Custo Unitário": "R$ 1.234,56" }];
    const result = StockItemMapper.map(rows);
    expect(result.success[0].costPrice).toBe(1234.56);
  });
});

// ==========================================
// ServiceMapper Tests
// ==========================================

describe("ServiceMapper", () => {
  it("should map valid service rows", () => {
    const rows = [
      { "Código Interno": 1, "Descrição": "ALINHAMENTO DIGITAL", "Custo do Serviço": "R$ 0,00", "Valor do Serviço": "R$ 100,00" },
    ];
    const result = ServiceMapper.map(rows);
    expect(result.success.length).toBe(1);
    expect(result.success[0].code).toBe("1");
    expect(result.success[0].description).toBe("ALINHAMENTO DIGITAL");
    expect(result.success[0].costPrice).toBe(0);
    expect(result.success[0].defaultPrice).toBe(100);
  });

  it("should error on missing code", () => {
    const rows = [{ "Código Interno": null, "Descrição": "Serviço" }];
    const result = ServiceMapper.map(rows);
    expect(result.errors.length).toBe(1);
  });

  it("should error on missing description", () => {
    const rows = [{ "Código Interno": 1, "Descrição": "" }];
    const result = ServiceMapper.map(rows);
    expect(result.errors.length).toBe(1);
  });

  it("should handle numeric values (not R$ format)", () => {
    const rows = [{ "Código Interno": 5, "Descrição": "SERVIÇO X", "Custo do Serviço": 50, "Valor do Serviço": 300 }];
    const result = ServiceMapper.map(rows);
    expect(result.success[0].costPrice).toBe(50);
    expect(result.success[0].defaultPrice).toBe(300);
  });

  it("should default to 0 for missing prices", () => {
    const rows = [{ "Código Interno": 1, "Descrição": "SERVIÇO Y" }];
    const result = ServiceMapper.map(rows);
    expect(result.success[0].costPrice).toBe(0);
    expect(result.success[0].defaultPrice).toBe(0);
  });
});
