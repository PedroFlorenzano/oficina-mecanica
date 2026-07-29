import { ParsedRow } from "./FileParser";

// ============================
// TIPOS DE RESULTADO
// ============================

export interface ImportResult<T> {
  success: T[];
  errors: ImportError[];
  skipped: ImportSkipped[];
  warnings: string[];
}

export interface ImportError {
  row: number;
  field?: string;
  value?: string;
  message: string;
}

export interface ImportSkipped {
  row: number;
  reason: string;
  data?: Record<string, unknown>;
}

// ============================
// DTOs DE IMPORTAÇÃO
// ============================

export interface ImportClientDTO {
  name: string;
  document: string;
  docType: "CPF" | "CNPJ";
  phone: string | null;
  email: string | null;
  address: string | null;
  active: boolean;
}

export interface ImportVehicleDTO {
  plate: string;
  brand: string;
  model: string;
  year: number;
  yearModel: number | null;
  clientName: string; // Used to link to client
  chassis: string | null;
}

export interface ImportStockItemDTO {
  code: string;
  reference: string | null;
  brand: string | null;
  unit: string;
  description: string;
  ncm: string | null;
  quantity: number;
  costPrice: number;
}

export interface ImportServiceDTO {
  code: string;
  description: string;
  costPrice: number;
  defaultPrice: number;
}

// ============================
// MAPPERS
// ============================

export class ClientMapper {
  static map(rows: ParsedRow[]): ImportResult<ImportClientDTO> {
    const result: ImportResult<ImportClientDTO> = {
      success: [],
      errors: [],
      skipped: [],
      warnings: [],
    };

    rows.forEach((row, index) => {
      const rowNum = index + 2; // +2 because header is row 1

      // Filter: only Clients (not Fornecedor/Transportadora)
      const tipo = this.getString(row, [
        "Tipo",
        "tipo",
        "TIPO",
      ]);
      if (tipo && tipo.toLowerCase() !== "cliente") {
        result.skipped.push({
          row: rowNum,
          reason: `Tipo "${tipo}" ignorado (não é Cliente)`,
        });
        return;
      }

      // Filter: only Active
      const status = this.getString(row, ["Status", "status", "STATUS"]);
      const active = !status || status.toLowerCase() === "ativo";

      const name = this.getString(row, [
        "Nome",
        "nome",
        "NOME",
        "Razão Social",
        "Cliente",
      ]);
      if (!name) {
        result.errors.push({
          row: rowNum,
          field: "nome",
          message: "Nome é obrigatório",
        });
        return;
      }

      const rawDoc = this.getString(row, [
        "CNPJ",
        "CPF",
        "CNPJ/CPF",
        "Documento",
        "documento",
        "CPF/CNPJ",
      ]);
      if (!rawDoc) {
        result.errors.push({
          row: rowNum,
          field: "documento",
          message: "Documento (CPF/CNPJ) é obrigatório",
        });
        return;
      }

      const document = rawDoc.replace(/[^\d]/g, "");
      let docType: "CPF" | "CNPJ";
      if (document.length === 11) {
        docType = "CPF";
      } else if (document.length === 14) {
        docType = "CNPJ";
      } else {
        result.errors.push({
          row: rowNum,
          field: "documento",
          value: rawDoc,
          message: `Documento inválido (${document.length} dígitos)`,
        });
        return;
      }

      const phone = this.getString(row, [
        "Celular",
        "Telefone",
        "celular",
        "telefone",
        "Fone",
      ]);
      const email = this.getString(row, ["Email", "E-mail", "email", "EMAIL"]);
      const address = this.getString(row, [
        "Endereço",
        "endereco",
        "Endereco",
        "ENDEREÇO",
      ]);

      result.success.push({
        name: name.trim(),
        document,
        docType,
        phone: phone || null,
        email: email || null,
        address: address || null,
        active,
      });
    });

    return result;
  }

  private static getString(
    row: ParsedRow,
    keys: string[]
  ): string | null {
    for (const key of keys) {
      const val = row[key];
      if (val !== null && val !== undefined && String(val).trim()) {
        return String(val).trim();
      }
    }
    return null;
  }
}

export class VehicleMapper {
  static map(rows: ParsedRow[]): ImportResult<ImportVehicleDTO> {
    const result: ImportResult<ImportVehicleDTO> = {
      success: [],
      errors: [],
      skipped: [],
      warnings: [],
    };

    rows.forEach((row, index) => {
      const rowNum = index + 2;

      const plate = this.getString(row, ["Placa", "placa", "PLACA"]);
      if (!plate) {
        result.errors.push({
          row: rowNum,
          field: "placa",
          message: "Placa é obrigatória",
        });
        return;
      }

      const cleanPlate = plate.replace(/[^A-Z0-9]/gi, "").toUpperCase();
      if (cleanPlate.length < 7) {
        result.errors.push({
          row: rowNum,
          field: "placa",
          value: plate,
          message: "Placa inválida (menos de 7 caracteres)",
        });
        return;
      }

      const brand = this.getString(row, ["Marca", "marca", "MARCA"]) || "N/I";
      const model = this.getString(row, ["Modelo", "modelo", "MODELO"]) || "N/I";
      const clientName = this.getString(row, [
        "Cliente",
        "Proprietário",
        "proprietario",
        "CLIENTE",
      ]);

      if (!clientName) {
        result.errors.push({
          row: rowNum,
          field: "cliente",
          message: "Nome do proprietário é obrigatório para vincular o veículo",
        });
        return;
      }

      // Parse year - Syscar format: "2022 - 2023" or just "2022"
      const rawYear = this.getString(row, ["Ano", "ano", "ANO"]);
      let year = new Date().getFullYear();
      let yearModel: number | null = null;

      if (rawYear) {
        const parts = rawYear.split(/\s*-\s*/);
        const y1 = parseInt(parts[0]);
        if (!isNaN(y1) && y1 > 1900 && y1 < 2100) {
          year = y1;
          if (parts[1]) {
            const y2 = parseInt(parts[1]);
            if (!isNaN(y2) && y2 > 1900 && y2 < 2100) {
              yearModel = y2;
            }
          }
        }
      }

      // Try to extract chassis from vehicle string (Relatório de Vendas format)
      let chassis: string | null = null;
      const rawVehicle = this.getString(row, ["Veículo", "Ve\ud8f5lo"]);
      if (rawVehicle) {
        const chassisMatch = rawVehicle.match(/\[([A-Z0-9]{17})\]/);
        if (chassisMatch) chassis = chassisMatch[1];
      }

      result.success.push({
        plate: cleanPlate,
        brand: brand.trim(),
        model: model.trim(),
        year,
        yearModel,
        clientName: clientName.trim(),
        chassis,
      });
    });

    return result;
  }

  private static getString(row: ParsedRow, keys: string[]): string | null {
    for (const key of keys) {
      const val = row[key];
      if (val !== null && val !== undefined && String(val).trim()) {
        return String(val).trim();
      }
    }
    return null;
  }
}

export class StockItemMapper {
  static map(rows: ParsedRow[]): ImportResult<ImportStockItemDTO> {
    const result: ImportResult<ImportStockItemDTO> = {
      success: [],
      errors: [],
      skipped: [],
      warnings: [],
    };

    rows.forEach((row, index) => {
      const rowNum = index + 2;

      const rawCode = this.getValue(row, ["Código", "Codigo", "C\u00f3digo", "CODIGO", "Cod"]);
      const code = rawCode !== null ? String(rawCode) : null;
      if (!code) {
        result.errors.push({
          row: rowNum,
          field: "código",
          message: "Código é obrigatório",
        });
        return;
      }

      const description = this.getString(row, [
        "Descrição",
        "Descricao",
        "DESCRIÇÃO",
        "descricao",
      ]);
      if (!description) {
        result.errors.push({
          row: rowNum,
          field: "descrição",
          message: "Descrição é obrigatória",
        });
        return;
      }

      const reference = this.getString(row, [
        "Referência",
        "Referencia",
        "REFERÊNCIA",
        "Ref",
      ]);
      const brand = this.getString(row, ["Marca", "marca", "MARCA"]);
      const unit = this.getString(row, ["Unidade", "unidade", "UNIDADE", "UN"]) || "UN";
      const ncm = this.getString(row, ["NCM", "ncm"]);

      // Parse quantity (can be decimal in Syscar for liters etc)
      const rawQty = this.getNumber(row, [
        "Estoque",
        "Quantidade",
        "Qtd",
        "QTD",
        "estoque",
      ]);
      const quantity = Math.max(0, Math.round(rawQty || 0));

      // Parse cost
      const rawCost = this.getNumber(row, [
        "Custo Unitário",
        "Custo",
        "custo",
        "CUSTO",
        "Custo Unit\u00e1rio",
      ]);
      const costPrice = Math.max(0, rawCost || 0);

      result.success.push({
        code: String(code),
        reference: reference || null,
        brand: brand || null,
        unit: unit.toUpperCase(),
        description: description.trim(),
        ncm: ncm ? String(ncm) : null,
        quantity,
        costPrice: Math.round(costPrice * 100) / 100,
      });
    });

    return result;
  }

  private static getString(row: ParsedRow, keys: string[]): string | null {
    for (const key of keys) {
      const val = row[key];
      if (val !== null && val !== undefined && String(val).trim()) {
        return String(val).trim();
      }
    }
    return null;
  }

  private static getValue(row: ParsedRow, keys: string[]): string | number | null {
    for (const key of keys) {
      if (row[key] !== null && row[key] !== undefined) return row[key];
    }
    return null;
  }

  private static getNumber(row: ParsedRow, keys: string[]): number | null {
    for (const key of keys) {
      const val = row[key];
      if (val === null || val === undefined) continue;
      if (typeof val === "number") return val;
      // Parse "R$ 1.234,56" format
      const cleaned = String(val)
        .replace(/R\$\s*/g, "")
        .replace(/\./g, "")
        .replace(",", ".");
      const num = parseFloat(cleaned);
      if (!isNaN(num)) return num;
    }
    return null;
  }
}

export class ServiceMapper {
  static map(rows: ParsedRow[]): ImportResult<ImportServiceDTO> {
    const result: ImportResult<ImportServiceDTO> = {
      success: [],
      errors: [],
      skipped: [],
      warnings: [],
    };

    rows.forEach((row, index) => {
      const rowNum = index + 2;

      const rawCode = this.getValue(row, [
        "Código Interno",
        "Codigo Interno",
        "Código",
        "Cod",
      ]);
      const code = rawCode !== null ? String(rawCode) : null;
      if (!code) {
        result.errors.push({
          row: rowNum,
          field: "código",
          message: "Código é obrigatório",
        });
        return;
      }

      const description = this.getString(row, [
        "Descrição",
        "Descricao",
        "DESCRIÇÃO",
        "Nome",
      ]);
      if (!description) {
        result.errors.push({
          row: rowNum,
          field: "descrição",
          message: "Descrição é obrigatória",
        });
        return;
      }

      const costPrice = this.parseMoney(row, [
        "Custo do Serviço",
        "Custo",
        "custo",
      ]) || 0;
      const defaultPrice = this.parseMoney(row, [
        "Valor do Serviço",
        "Valor",
        "Preço",
        "Venda",
      ]) || 0;

      result.success.push({
        code: String(code),
        description: description.trim(),
        costPrice: Math.round(costPrice * 100) / 100,
        defaultPrice: Math.round(defaultPrice * 100) / 100,
      });
    });

    return result;
  }

  private static getString(row: ParsedRow, keys: string[]): string | null {
    for (const key of keys) {
      const val = row[key];
      if (val !== null && val !== undefined && String(val).trim()) {
        return String(val).trim();
      }
    }
    return null;
  }

  private static getValue(row: ParsedRow, keys: string[]): string | number | null {
    for (const key of keys) {
      if (row[key] !== null && row[key] !== undefined) return row[key];
    }
    return null;
  }

  private static parseMoney(row: ParsedRow, keys: string[]): number | null {
    for (const key of keys) {
      const val = row[key];
      if (val === null || val === undefined) continue;
      if (typeof val === "number") return val;
      const cleaned = String(val)
        .replace(/R\$\s*/g, "")
        .replace(/\./g, "")
        .replace(",", ".");
      const num = parseFloat(cleaned);
      if (!isNaN(num)) return num;
    }
    return null;
  }
}
