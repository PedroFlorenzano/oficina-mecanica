import { ValidationError } from "../errors/DomainError";

export class Money {
  private constructor(private readonly cents: number) {}

  static fromFloat(value: number): Money {
    if (value < 0) throw new ValidationError("Valor monetário não pode ser negativo");
    return new Money(Math.round(value * 100));
  }

  static zero(): Money {
    return new Money(0);
  }

  add(other: Money): Money {
    return new Money(this.cents + other.cents);
  }

  subtract(other: Money): Money {
    return new Money(this.cents - other.cents);
  }

  multiply(factor: number): Money {
    return new Money(Math.round(this.cents * factor));
  }

  toFloat(): number {
    return this.cents / 100;
  }

  toString(): string {
    return `R$ ${this.toFloat().toFixed(2)}`;
  }

  equals(other: Money): boolean {
    return this.cents === other.cents;
  }

  isZero(): boolean {
    return this.cents === 0;
  }

  isPositive(): boolean {
    return this.cents > 0;
  }
}
