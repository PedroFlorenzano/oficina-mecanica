import { NextResponse } from "next/server";
import { DomainError } from "@/domain/errors/DomainError";

export function handleError(error: unknown): NextResponse {
  if (error instanceof DomainError) {
    const statusMap: Record<string, number> = {
      VALIDATION_ERROR: 400,
      NOT_FOUND: 404,
      CONFLICT: 409,
      BUSINESS_RULE_VIOLATION: 400,
    };
    const status = statusMap[error.code] || 400;
    return NextResponse.json({ error: error.message, code: error.code }, { status });
  }
  console.error("Unhandled error:", error);
  return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
}
