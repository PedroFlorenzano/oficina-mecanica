import { ValidationError } from "../errors/DomainError";

export class CPF {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(raw: string): CPF {
    const cleaned = raw.replace(/\D/g, "");
    if (cleaned.length !== 11) throw new ValidationError("CPF deve ter 11 dígitos");
    if (/^(\d)\1{10}$/.test(cleaned)) throw new ValidationError("CPF inválido");

    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(cleaned[i]) * (10 - i);
    let remainder = (sum * 10) % 11;
    if (remainder === 10) remainder = 0;
    if (remainder !== parseInt(cleaned[9])) throw new ValidationError("CPF inválido");

    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(cleaned[i]) * (11 - i);
    remainder = (sum * 10) % 11;
    if (remainder === 10) remainder = 0;
    if (remainder !== parseInt(cleaned[10])) throw new ValidationError("CPF inválido");

    return new CPF(cleaned);
  }

  toString(): string {
    return this.value;
  }

  equals(other: CPF): boolean {
    return this.value === other.value;
  }
}
