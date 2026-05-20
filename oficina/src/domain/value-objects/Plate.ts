import { ValidationError } from "../errors/DomainError";

export class Plate {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(raw: string): Plate {
    const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (cleaned.length < 7 || cleaned.length > 8) {
      throw new ValidationError("Placa inválida");
    }
    return new Plate(cleaned);
  }

  toString(): string {
    return this.value;
  }

  equals(other: Plate): boolean {
    return this.value === other.value;
  }
}
