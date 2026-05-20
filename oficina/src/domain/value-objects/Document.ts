import { CPF } from "./CPF";
import { CNPJ } from "./CNPJ";
import { ValidationError } from "../errors/DomainError";

export type DocumentType = "CPF" | "CNPJ";

export class Document {
  private constructor(
    public readonly value: string,
    public readonly type: DocumentType
  ) {}

  static create(raw: string): Document {
    const cleaned = raw.replace(/\D/g, "");
    if (cleaned.length === 11) {
      CPF.create(raw);
      return new Document(cleaned, "CPF");
    } else if (cleaned.length === 14) {
      CNPJ.create(raw);
      return new Document(cleaned, "CNPJ");
    }
    throw new ValidationError("Documento deve ser CPF (11 dígitos) ou CNPJ (14 dígitos)");
  }

  isCNPJ(): boolean {
    return this.type === "CNPJ";
  }

  isCPF(): boolean {
    return this.type === "CPF";
  }

  toString(): string {
    return this.value;
  }

  equals(other: Document): boolean {
    return this.value === other.value;
  }
}
