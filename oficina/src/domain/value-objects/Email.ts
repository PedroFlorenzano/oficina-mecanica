import { ValidationError } from "../errors/DomainError";

export class Email {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(raw: string): Email {
    const trimmed = raw.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      throw new ValidationError("E-mail inválido");
    }
    return new Email(trimmed);
  }

  static createOptional(raw: string | null | undefined): Email | null {
    if (!raw || !raw.trim()) return null;
    return Email.create(raw);
  }

  toString(): string {
    return this.value;
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }
}
