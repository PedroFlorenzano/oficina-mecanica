import { ValidationError } from "@/domain/errors/DomainError";
import { withTenant } from "../prisma";
import fc from "fast-check";

describe("withTenant", () => {
  it("deve lançar ValidationError para string vazia", () => {
    expect(() => withTenant("")).toThrow(ValidationError);
  });

  it("deve lançar ValidationError para undefined", () => {
    expect(() => withTenant(undefined as unknown as string)).toThrow(ValidationError);
  });

  it("deve lançar ValidationError para string com apenas espaços", () => {
    expect(() => withTenant("   ")).toThrow(ValidationError);
  });

  it("deve retornar instância Prisma para tenantId válido", () => {
    const result = withTenant("tenant-valido");
    expect(result).toBeDefined();
    expect(typeof result.$transaction).toBe("function");
  });

  // Feature: postgresql-rls-migration, Property 5: withTenant rejeita tenantId inválido
  it("property: rejeita qualquer tenantId inválido", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(""),
          fc.constant(undefined as unknown as string),
          fc.constant("   "),
          fc.constant("  \t  ")
        ),
        (invalidId) => {
          expect(() => withTenant(invalidId)).toThrow(ValidationError);
        }
      ),
      { numRuns: 100 }
    );
  });
});
