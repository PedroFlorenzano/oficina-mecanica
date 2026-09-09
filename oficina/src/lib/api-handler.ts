import { NextResponse } from "next/server";
import { DomainError, RateLimitError } from "@/domain/errors/DomainError";

export function handleError(error: unknown): NextResponse | Response {
  // Auth middleware throws Response directly for 401
  if (error instanceof Response) return error;

  // Rate limit: 429 + Retry-After (em segundos)
  if (error instanceof RateLimitError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: 429, headers: { "Retry-After": String(error.retryAfterSeconds) } }
    );
  }

  if (error instanceof DomainError) {
    const statusMap: Record<string, number> = {
      VALIDATION_ERROR: 400,
      NOT_FOUND: 404,
      CONFLICT: 409,
      BUSINESS_RULE_VIOLATION: 400,
      AUTHENTICATION_ERROR: 401,
      FORBIDDEN: 403,
      RATE_LIMIT_EXCEEDED: 429,
    };
    const status = statusMap[error.code] || 400;
    return NextResponse.json({ error: error.message, code: error.code }, { status });
  }
  console.error("Unhandled error:", error);
  const message = error instanceof Error ? error.message : "Erro interno do servidor";
  return NextResponse.json({ error: "Erro interno do servidor", detail: message }, { status: 500 });
}
