import { PrismaClient } from "@prisma/client";
import { ValidationError } from "@/domain/errors/DomainError";

// ============================================================
// Prisma Singleton — Cliente base (sem contexto de tenant)
// ============================================================

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient;
  prismaAdmin: PrismaClient;
};

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// ============================================================
// prismaAdmin — BYPASSRLS — uso EXCLUSIVO em operações cross-tenant
// RISCO: Se a conexão usar role com BYPASSRLS, as policies RLS não filtrarão linhas.
// Usar APENAS em: login (findByEmail), assinatura pública, script de migração.
// ============================================================

export const prismaAdmin =
  globalForPrisma.prismaAdmin ||
  new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL_ADMIN || process.env.DATABASE_URL,
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prismaAdmin = prismaAdmin;

// ============================================================
// withTenant — Retorna cliente Prisma com contexto RLS configurado
// Defense in depth: RLS também filtra no banco
// ============================================================

export type PrismaClientWithTenant = PrismaClient;

export function withTenant(tenantId: string): PrismaClientWithTenant {
  if (!tenantId || tenantId.trim() === "") {
    throw new ValidationError("tenantId é obrigatório para operações com contexto de tenant");
  }

  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          const [, result] = await prisma.$transaction([
            prisma.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`,
            query(args),
          ]);
          return result;
        },
      },
    },
  }) as unknown as PrismaClientWithTenant;
}
