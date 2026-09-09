export class DomainError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = "DomainError";
  }
}

export class ValidationError extends DomainError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR");
  }
}

export class NotFoundError extends DomainError {
  constructor(entity: string, id?: string) {
    super(`${entity} não encontrado${id ? `: ${id}` : ""}`, "NOT_FOUND");
  }
}

export class ConflictError extends DomainError {
  constructor(message: string) {
    super(message, "CONFLICT");
  }
}

export class BusinessRuleError extends DomainError {
  constructor(message: string) {
    super(message, "BUSINESS_RULE_VIOLATION");
  }
}

export class AuthenticationError extends DomainError {
  constructor(message: string) {
    super(message, "AUTHENTICATION_ERROR");
  }
}

export class ForbiddenError extends DomainError {
  constructor(message: string) {
    super(message, "FORBIDDEN");
  }
}

/** Excesso de requisições em endpoint público (HTTP 429). */
export class RateLimitError extends DomainError {
  constructor(message: string, public readonly retryAfterSeconds: number) {
    super(message, "RATE_LIMIT_EXCEEDED");
  }
}
