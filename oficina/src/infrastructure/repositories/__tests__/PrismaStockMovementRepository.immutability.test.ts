/**
 * Testes de propriedade: Imutabilidade do log de movimentos de estoque
 * Valida que IStockMovementRepository e PrismaStockMovementRepository
 * não expõem métodos de update ou delete — garantindo rastreabilidade auditável.
 */

import { PrismaStockMovementRepository } from "@/infrastructure/repositories/PrismaStockMovementRepository";
import { PrismaClient } from "@prisma/client";
import type { IStockMovementRepository } from "@/domain/repositories/IStockMovementRepository";

const mockDb = {} as PrismaClient;

describe("PrismaStockMovementRepository — Imutabilidade", () => {
  it("deve implementar IStockMovementRepository sem métodos update ou delete", () => {
    const repo = new PrismaStockMovementRepository(mockDb);

    // Confirma que os métodos obrigatórios estão presentes
    expect(typeof repo.create).toBe("function");
    expect(typeof repo.findPendingReservations).toBe("function");
    expect(typeof repo.findByOrderId).toBe("function");
  });

  it("não deve ter método update na instância do repositório", () => {
    const repo = new PrismaStockMovementRepository(mockDb);

    // @ts-expect-error — update não deve existir na interface nem na implementação
    expect(repo.update).toBeUndefined();
  });

  it("não deve ter método delete na instância do repositório", () => {
    const repo = new PrismaStockMovementRepository(mockDb);

    // @ts-expect-error — delete não deve existir na interface nem na implementação
    expect(repo.delete).toBeUndefined();
  });

  it("a interface IStockMovementRepository não deve expor update", () => {
    // Verificação em tempo de compilação: o tipo não deve ter update
    const repo: IStockMovementRepository = new PrismaStockMovementRepository(mockDb);

    const hasUpdate = "update" in repo;
    expect(hasUpdate).toBe(false);
  });

  it("a interface IStockMovementRepository não deve expor delete", () => {
    const repo: IStockMovementRepository = new PrismaStockMovementRepository(mockDb);

    const hasDelete = "delete" in repo;
    expect(hasDelete).toBe(false);
  });

  it("deve ter exatamente os métodos definidos pela interface (create, findPendingReservations, findByOrderId)", () => {
    const repo = new PrismaStockMovementRepository(mockDb);
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(repo))
      .filter((m) => m !== "constructor");

    expect(methods).toContain("create");
    expect(methods).toContain("findPendingReservations");
    expect(methods).toContain("findByOrderId");
    expect(methods).not.toContain("update");
    expect(methods).not.toContain("delete");
  });
});
