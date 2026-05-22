import { ValidationError } from "@/domain/errors/DomainError";

export class PasswordValidator {
  static readonly MIN_LENGTH = 8;

  static isValid(password: string): boolean {
    return (
      password.length >= this.MIN_LENGTH &&
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /[0-9]/.test(password)
    );
  }

  static validate(password: string): void {
    if (!this.isValid(password)) {
      throw new ValidationError(
        "A senha deve ter no mínimo 8 caracteres, incluindo letras maiúsculas, minúsculas e números."
      );
    }
  }
}
