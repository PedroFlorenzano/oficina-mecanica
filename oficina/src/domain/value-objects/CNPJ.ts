import { ValidationError } from "../errors/DomainError";

export class CNPJ {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(raw: string): CNPJ {
    const cleaned = raw.replace(/\D/g, "");
    if (cleaned.length !== 14) throw new ValidationError("CNPJ deve ter 14 dígitos");
    if (/^(\d)\1{13}$/.test(cleaned)) throw new ValidationError("CNPJ inválido");

    const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

    let sum = 0;
    for (let i = 0; i < 12; i++) sum += parseInt(cleaned[i]) * weights1[i];
    let remainder = sum % 11;
    const digit1 = remainder < 2 ? 0 : 11 - remainder;
    if (parseInt(cleaned[12]) !== digit1) throw new ValidationError("CNPJ inválido");

    sum = 0;
    for (let i = 0; i < 13; i++) sum += parseInt(cleaned[i]) * weights2[i];
    remainder = sum % 11;
    const digit2 = remainder < 2 ? 0 : 11 - remainder;
    if (parseInt(cleaned[13]) !== digit2) throw new ValidationError("CNPJ inválido");

    return new CNPJ(cleaned);
  }

  toString(): string {
    return this.value;
  }

  equals(other: CNPJ): boolean {
    return this.value === other.value;
  }
}
