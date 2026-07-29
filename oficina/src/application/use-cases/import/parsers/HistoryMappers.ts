import { ParsedRow } from "./FileParser";

// ============================
// DTOs de importação — módulos adicionais
// ============================

export interface ImportOrderDTO {
  number: number;
  clientName: string;
  plate: string | null;
  brand: string | null;
  model: string | null;
  chassis: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  emissionDate: string | null;
  exitDate: string | null;
  discount: number;
  total: number;
  paymentMethod: string | null;
  mechanics: string | null;
}

export interface ImportInvoiceDTO {
  number: number;
  type: "NFE" | "NFSE";
  status: string;
  cfop: string | null;
  emissionDate: string | null;
  clientName: string;
  clientDocument: string | null;
  city: string | null;
  uf: string | null;
  accessKey: string | null;
  totalAmount: number;
}

export interface ImportFinancialDTO {
  status: string; // PAGA, ABERTA, CANCELADA
  dueDate: string | null;
  payDate: string | null;
  docNumber: string | null;
  origin: string | null; // "O.S.: 11" ou "NF Compra: 450968"
  description: string;
  category: string | null;
  paymentType: string | null;
  amount: number;
  type: "CREDIT" | "DEBIT";
}

export interface ImportProductivityDTO {
  clientName: string;
  orderNumber: number;
  plate: string | null;
  serviceName: string;
  mechanicName: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  durationMinutes: number;
}

// ============================
// Tipos de resultado (reexportados do DataMappers.ts principal)
// ============================

export interface ImportError {
  row: number;
  field?: string;
  value?: string;
  message: string;
}

export interface ImportSkipped {
  row: number;
  reason: string;
}

export interface ImportResult<T> {
  success: T[];
  errors: ImportError[];
  skipped: ImportSkipped[];
  warnings: string[];
}

// ============================
// MAPPERS
// ============================

export class OrderMapper {
  static map(rows: ParsedRow[]): ImportResult<ImportOrderDTO> {
    const result: ImportResult<ImportOrderDTO> = { success: [], errors: [], skipped: [], warnings: [] };

    rows.forEach((row, index) => {
      const rowNum = index + 2;

      const osNum = this.getNumber(row, ["O.S.", "OS", "Número", "N°"]);
      if (!osNum || osNum <= 0) {
        result.errors.push({ row: rowNum, field: "O.S.", message: "Número da OS inválido" });
        return;
      }

      const clientName = this.getString(row, ["Cliente", "CLIENTE", "cliente"]);
      if (!clientName) {
        result.errors.push({ row: rowNum, field: "cliente", message: "Cliente é obrigatório" });
        return;
      }

      // Parse vehicle string: "RUM7J67 CITROEN [9BGRG08F0CG399442] C4CACTUS FEEL AT"
      const rawVehicle = this.getString(row, ["Veículo", "Veiculo", "VEÍCULO"]);
      let plate: string | null = null;
      let brand: string | null = null;
      let model: string | null = null;
      let chassis: string | null = null;

      if (rawVehicle && rawVehicle !== "Veículo não Identificado") {
        const plateMatch = rawVehicle.match(/^([A-Z]{3}\d[A-Z0-9]\d{2})/);
        if (plateMatch) plate = plateMatch[1];

        const chassisMatch = rawVehicle.match(/\[([A-Z0-9]{17})\]/);
        if (chassisMatch) chassis = chassisMatch[1];

        // Brand is after plate, before [chassis]
        const parts = rawVehicle.replace(/\[[^\]]*\]/, "").split(/\s+/).filter(Boolean);
        if (parts.length > 1) brand = parts[1];
        if (parts.length > 2) model = parts.slice(2).join(" ");
      }

      const total = this.parseMoney(row, ["Total", "TOTAL", "Valor Total"]) || 0;

      result.success.push({
        number: osNum,
        clientName: clientName.trim(),
        plate,
        brand,
        model,
        chassis,
        phone: this.getString(row, ["Celular", "Telefone"]),
        email: this.getString(row, ["E-mail", "Email"]),
        city: this.getString(row, ["Cidade", "CIDADE"]),
        emissionDate: this.getString(row, ["Emissão", "EMISSÃO", "Data Emissão"]),
        exitDate: this.getString(row, ["Saída", "SAÍDA", "Data Saída"]),
        discount: this.parseMoney(row, ["Desconto", "DESCONTO"]) || 0,
        total,
        paymentMethod: this.getString(row, ["Forma de Pagamento", "FORMA PGTO"]),
        mechanics: this.getString(row, ["Responsáveis", "Mecânico", "RESPONSÁVEIS"]),
      });
    });

    // Deduplicate by OS number (keep one with highest total — the closed one)
    const byNumber = new Map<number, ImportOrderDTO>();
    for (const dto of result.success) {
      const existing = byNumber.get(dto.number);
      if (!existing || dto.total > existing.total) {
        byNumber.set(dto.number, dto);
      }
    }
    result.success = Array.from(byNumber.values());

    return result;
  }

  private static getString(row: ParsedRow, keys: string[]): string | null {
    for (const key of keys) {
      const val = row[key];
      if (val !== null && val !== undefined && String(val).trim()) return String(val).trim();
    }
    return null;
  }

  private static getNumber(row: ParsedRow, keys: string[]): number | null {
    for (const key of keys) {
      const val = row[key];
      if (val === null || val === undefined) continue;
      if (typeof val === "number") return val;
      const num = parseInt(String(val));
      if (!isNaN(num)) return num;
    }
    return null;
  }

  private static parseMoney(row: ParsedRow, keys: string[]): number | null {
    for (const key of keys) {
      const val = row[key];
      if (val === null || val === undefined) continue;
      if (typeof val === "number") return val;
      const cleaned = String(val).replace(/R\$\s*/g, "").replace(/\./g, "").replace(",", ".");
      const num = parseFloat(cleaned);
      if (!isNaN(num)) return num;
    }
    return null;
  }
}

export class InvoiceMapper {
  static map(rows: ParsedRow[]): ImportResult<ImportInvoiceDTO> {
    const result: ImportResult<ImportInvoiceDTO> = { success: [], errors: [], skipped: [], warnings: [] };

    rows.forEach((row, index) => {
      const rowNum = index + 2;

      const num = this.getNumber(row, ["NUM", "Número", "NF"]);
      if (!num) {
        result.errors.push({ row: rowNum, message: "Número da nota é obrigatório" });
        return;
      }

      const statusRaw = this.getString(row, ["STATUS", "Status"]) || "";
      // Map Syscar status to our format
      const statusMap: Record<string, string> = {
        "APROVADA": "AUTHORIZED",
        "CANCELADA": "CANCELLED",
        "REJEITADA": "REJECTED",
        "PENDENTE": "PENDING",
      };
      const status = statusMap[statusRaw.toUpperCase()] || statusRaw;

      const tipoRaw = this.getString(row, ["TIPO", "Tipo"]) || "SAÍDA";
      // If CFOP starts with 5, it's NF-e (products); services would be NFS-e
      const cfop = this.getString(row, ["CFOP"]);
      const type: "NFE" | "NFSE" = cfop && cfop.startsWith("5") ? "NFE" : "NFE";

      const clientName = this.getString(row, ["CLIENTE", "Cliente"]);
      if (!clientName) {
        result.errors.push({ row: rowNum, message: "Cliente é obrigatório na nota" });
        return;
      }

      const total = this.parseMoney(row, ["R$ TOTAL", "Total", "VALOR"]) || 0;

      // Access key may be parsed as exponential number
      let accessKey: string | null = null;
      const rawKey = row["CHAVE"] ?? row["Chave"];
      if (rawKey && typeof rawKey === "number") {
        accessKey = rawKey.toFixed(0);
      } else if (rawKey) {
        accessKey = String(rawKey);
      }

      result.success.push({
        number: num,
        type,
        status,
        cfop,
        emissionDate: this.getString(row, ["EMISSÃO", "Emissão", "DATA"]),
        clientName: clientName.trim(),
        clientDocument: this.getString(row, ["CNPJ/CPF", "CPF/CNPJ", "Documento"]),
        city: this.getString(row, ["CIDADE", "Cidade"]),
        uf: this.getString(row, ["UF", "Estado"]),
        accessKey: accessKey && accessKey.length >= 40 ? accessKey : null,
        totalAmount: total,
      });
    });

    return result;
  }

  private static getString(row: ParsedRow, keys: string[]): string | null {
    for (const key of keys) {
      const val = row[key];
      if (val !== null && val !== undefined && String(val).trim()) return String(val).trim();
    }
    return null;
  }

  private static getNumber(row: ParsedRow, keys: string[]): number | null {
    for (const key of keys) {
      const val = row[key];
      if (val === null || val === undefined) continue;
      if (typeof val === "number") return val;
      const num = parseInt(String(val));
      if (!isNaN(num)) return num;
    }
    return null;
  }

  private static parseMoney(row: ParsedRow, keys: string[]): number | null {
    for (const key of keys) {
      const val = row[key];
      if (val === null || val === undefined) continue;
      if (typeof val === "number") return val;
      const cleaned = String(val).replace(/R\$\s*/g, "").replace(/\./g, "").replace(",", ".");
      const num = parseFloat(cleaned);
      if (!isNaN(num)) return num;
    }
    return null;
  }
}

export class FinancialMapper {
  static map(rows: ParsedRow[]): ImportResult<ImportFinancialDTO> {
    const result: ImportResult<ImportFinancialDTO> = { success: [], errors: [], skipped: [], warnings: [] };

    rows.forEach((row, index) => {
      const rowNum = index + 2;

      const description = this.getString(row, ["DESCRIÇÃO", "Descrição", "DESCRICAO"]);
      if (!description) {
        result.errors.push({ row: rowNum, message: "Descrição é obrigatória" });
        return;
      }

      const status = this.getString(row, ["CONF", "Status", "SITUAÇÃO"]) || "ABERTA";

      // Determine type from description
      const isCredit = description.includes("[CRÉDITO]") || description.includes("[CREDITO]");
      const isDebit = description.includes("[DÉBITO]") || description.includes("[DEBITO]");
      const type: "CREDIT" | "DEBIT" = isDebit ? "DEBIT" : "CREDIT";

      const rawAmount = this.getNumber(row, ["VALOR TOTAL", "Valor", "VALOR"]);
      let amount = rawAmount || 0;
      // Negative values in Syscar mean debit
      if (amount < 0) amount = Math.abs(amount);

      result.success.push({
        status: status.toUpperCase(),
        dueDate: this.getString(row, ["VENC", "Vencimento"]),
        payDate: this.getString(row, ["PAG", "Pagamento"]),
        docNumber: this.getString(row, ["Nº DOC", "N DOC", "DOC"]),
        origin: this.getString(row, ["ORIGEM", "Origem"]),
        description: description.replace(/\[CRÉDITO\]|\[DÉBITO\]|\[CREDITO\]|\[DEBITO\]/g, "").trim(),
        category: this.getString(row, ["PLANO ORÇ PRIM", "PLANO ORÇ", "Categoria"]),
        paymentType: this.getString(row, ["TIPO PGTO", "Forma Pgto"]),
        amount: Math.round(amount * 100) / 100,
        type,
      });
    });

    return result;
  }

  private static getString(row: ParsedRow, keys: string[]): string | null {
    for (const key of keys) {
      const val = row[key];
      if (val !== null && val !== undefined && String(val).trim()) return String(val).trim();
    }
    return null;
  }

  private static getNumber(row: ParsedRow, keys: string[]): number | null {
    for (const key of keys) {
      const val = row[key];
      if (val === null || val === undefined) continue;
      if (typeof val === "number") return val;
      const cleaned = String(val).replace(/R\$\s*/g, "").replace(/--/g, "-").replace(/\./g, "").replace(",", ".");
      const num = parseFloat(cleaned);
      if (!isNaN(num)) return num;
    }
    return null;
  }
}

export class ProductivityMapper {
  static map(rows: ParsedRow[]): ImportResult<ImportProductivityDTO> {
    const result: ImportResult<ImportProductivityDTO> = { success: [], errors: [], skipped: [], warnings: [] };

    rows.forEach((row, index) => {
      const rowNum = index + 2;

      const serviceName = this.getString(row, ["Serviço", "SERVIÇO", "Servico"]);
      if (!serviceName) {
        result.errors.push({ row: rowNum, message: "Nome do serviço é obrigatório" });
        return;
      }

      const mechanicName = this.getString(row, ["Profissional", "Mecânico", "PROFISSIONAL"]);
      if (!mechanicName) {
        result.errors.push({ row: rowNum, message: "Nome do mecânico é obrigatório" });
        return;
      }

      const osNum = this.getNumber(row, ["O.S.", "OS"]);
      if (!osNum) {
        result.errors.push({ row: rowNum, message: "Número da OS é obrigatório" });
        return;
      }

      // Parse duration "0.17min" → 0.17
      const rawResult = this.getString(row, ["Resultado", "Duração"]);
      let durationMinutes = 0;
      if (rawResult) {
        const match = rawResult.match(/([\d.]+)\s*min/i);
        if (match) durationMinutes = parseFloat(match[1]);
      }

      // Parse vehicle string to get plate
      const rawVehicle = this.getString(row, ["Veículo", "Veiculo"]);
      let plate: string | null = null;
      if (rawVehicle) {
        const plateMatch = rawVehicle.match(/^([A-Z]{3}\d[A-Z0-9]\d{2})/);
        if (plateMatch) plate = plateMatch[1];
      }

      result.success.push({
        clientName: this.getString(row, ["Cliente", "CLIENTE"]) || "",
        orderNumber: osNum,
        plate,
        serviceName: serviceName.trim(),
        mechanicName: mechanicName.trim(),
        status: this.getString(row, ["Status", "STATUS"]) || "Finalizado",
        startDate: this.getString(row, ["Data inicio", "Início"]),
        endDate: this.getString(row, ["Data final", "Fim"]),
        durationMinutes: Math.round(durationMinutes * 100) / 100,
      });
    });

    return result;
  }

  private static getString(row: ParsedRow, keys: string[]): string | null {
    for (const key of keys) {
      const val = row[key];
      if (val !== null && val !== undefined && String(val).trim()) return String(val).trim();
    }
    return null;
  }

  private static getNumber(row: ParsedRow, keys: string[]): number | null {
    for (const key of keys) {
      const val = row[key];
      if (val === null || val === undefined) continue;
      if (typeof val === "number") return val;
      const num = parseInt(String(val));
      if (!isNaN(num)) return num;
    }
    return null;
  }
}
