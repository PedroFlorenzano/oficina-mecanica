import * as XLSX from "xlsx";

export interface ParsedRow {
  [key: string]: string | number | null;
}

export interface ParseResult {
  headers: string[];
  rows: ParsedRow[];
  totalRows: number;
  format: "xls" | "xlsx" | "csv" | "html-xls";
}

/**
 * Parser genérico que detecta formato e extrai dados tabulares.
 * Suporta: XLS binário, XLSX, CSV, e HTML-as-XLS (exportação Syscar).
 */
export class FileParser {
  /**
   * Parseia um buffer de arquivo e retorna headers + rows normalizados.
   */
  static parse(buffer: Buffer, filename: string): ParseResult {
    const format = this.detectFormat(buffer, filename);

    if (format === "html-xls") {
      return this.parseHtmlTable(buffer);
    }

    // XLSX lib handles XLS, XLSX, and CSV
    const workbook = XLSX.read(buffer, { type: "buffer", codepage: 1252 });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData: (string | number | null)[][] = XLSX.utils.sheet_to_json(
      worksheet,
      { header: 1, defval: null }
    );

    if (rawData.length === 0) {
      return { headers: [], rows: [], totalRows: 0, format };
    }

    const headers = this.normalizeHeaders(rawData[0]);
    const rows = rawData.slice(1).map((row) => {
      const obj: ParsedRow = {};
      headers.forEach((h, i) => {
        obj[h] = row[i] ?? null;
      });
      return obj;
    });

    return {
      headers,
      rows: rows.filter((r) => Object.values(r).some((v) => v !== null)),
      totalRows: rows.length,
      format,
    };
  }

  /**
   * Detecta o formato real do arquivo (nem sempre a extensão é confiável).
   */
  private static detectFormat(
    buffer: Buffer,
    filename: string
  ): "xls" | "xlsx" | "csv" | "html-xls" {
    const ext = filename.toLowerCase().split(".").pop();

    // Check if it's HTML disguised as XLS (common in Syscar exports)
    const head = buffer.slice(0, 200).toString("latin1").trim().toLowerCase();
    if (
      head.includes("<html") ||
      head.includes("<!doctype") ||
      head.includes("<table")
    ) {
      return "html-xls";
    }

    if (ext === "csv") return "csv";
    if (ext === "xlsx") return "xlsx";
    return "xls";
  }

  /**
   * Parseia arquivos HTML-as-XLS (Syscar exporta HTML com extensão .xls).
   */
  private static parseHtmlTable(buffer: Buffer): ParseResult {
    const content = buffer.toString("latin1");
    const trMatches = content.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi);

    if (!trMatches || trMatches.length === 0) {
      return { headers: [], rows: [], totalRows: 0, format: "html-xls" };
    }

    const extractCells = (tr: string): string[] => {
      const cells = tr.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
      return cells.map((cell) =>
        cell
          .replace(/<[^>]+>/g, "")
          .replace(/&nbsp;/gi, " ")
          .replace(/&amp;/gi, "&")
          .replace(/&lt;/gi, "<")
          .replace(/&gt;/gi, ">")
          .trim()
      );
    };

    const headers = this.normalizeHeaders(extractCells(trMatches[0]));
    const rows: ParsedRow[] = [];

    for (let i = 1; i < trMatches.length; i++) {
      const cells = extractCells(trMatches[i]);
      if (cells.every((c) => !c)) continue; // skip empty rows

      const obj: ParsedRow = {};
      headers.forEach((h, idx) => {
        const val = cells[idx] || null;
        // Try to parse numbers - detect format by content
        if (val && /^-?\d+([.,]\d+)?$/.test(val)) {
          // Simple number with optional decimal (dot or comma)
          obj[h] = parseFloat(val.replace(",", "."));
        } else if (val && /^-?\d{1,3}(\.\d{3})*(,\d+)?$/.test(val)) {
          // BR format: 1.234,56
          obj[h] = parseFloat(val.replace(/\./g, "").replace(",", "."));
        } else {
          obj[h] = val;
        }
      });
      rows.push(obj);
    }

    return { headers, rows, totalRows: rows.length, format: "html-xls" };
  }

  /**
   * Normaliza headers removendo caracteres especiais de encoding.
   * Syscar exports often have garbled encoding (latin1 read as utf8).
   */
  private static normalizeHeaders(
    raw: (string | number | null)[]
  ): string[] {
    return raw.map((h) => {
      if (h === null || h === undefined) return "col_unknown";
      let str = String(h);
      // Clean HTML artifacts from headers
      str = str.replace(/<[^>]+>/g, "").trim();
      // Normalize known garbled strings from Syscar
      str = this.fixEncoding(str);
      return str || "col_unknown";
    });
  }

  /**
   * Corrige encoding garbled comum nas exportações Syscar.
   */
  static fixEncoding(str: string): string {
    const fixes: Record<string, string> = {
      "C\u00f3digo Interno": "Código Interno",
      "C\u00f3digo": "Código",
      "Descri\u00e7\u00e3o": "Descrição",
      "Refer\u00eancia": "Referência",
      "Custo Unit\u00e1rio": "Custo Unitário",
      "\u00daltima OS": "Última OS",
      "Emiss\u00e3o": "Emissão",
      "Sa\u00edda": "Saída",
      "Ve\u00edculo": "Veículo",
      "Respons\u00e1veis": "Responsáveis",
    };

    for (const [garbled, correct] of Object.entries(fixes)) {
      if (str.includes(garbled)) return str.replace(garbled, correct);
    }

    // Generic cleanup of common encoding artifacts
    return str
      .replace(/\xf3/g, "ó")
      .replace(/\xe7\xe3/g, "ção")
      .replace(/\xe9/g, "é")
      .replace(/\xea/g, "ê")
      .replace(/\xed/g, "í")
      .replace(/\xfb/g, "ú")
      .replace(/\xe1/g, "á")
      .replace(/<\/td>/gi, "")
      .replace(/<td[^>]*>/gi, "")
      .trim();
  }
}
