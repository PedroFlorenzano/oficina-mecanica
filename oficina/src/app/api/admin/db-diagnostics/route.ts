import { NextResponse } from "next/server";
import { prisma, prismaAdmin } from "@/infrastructure/database/prisma";
import { handleError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";

interface RoleInfo {
  current_user: string;
  bypasses_rls: boolean;
  is_superuser: boolean;
}

interface RlsCoverage {
  tables_with_rls: number;
  policies: number;
}

/**
 * Diagnóstico de isolamento do banco (somente ADMIN).
 *
 * Responde a pergunta "o RLS está realmente ativo em produção?" sem expor
 * connection string: se o role da conexão tiver BYPASSRLS, as policies não
 * filtram linha nenhuma e o isolamento entre oficinas fica só na camada de código.
 *
 * Nenhum valor de variável de ambiente é retornado — apenas se está definida.
 */
export async function GET() {
  try {
    const session = await requireAuth();
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
    }

    const readRole = async (client: typeof prisma): Promise<RoleInfo | { error: string }> => {
      try {
        const rows = await client.$queryRaw<RoleInfo[]>`
          SELECT current_user::text                AS current_user,
                 COALESCE(r.rolbypassrls, false)   AS bypasses_rls,
                 COALESCE(r.rolsuper, false)       AS is_superuser
          FROM pg_roles r
          WHERE r.rolname = current_user
        `;
        return rows[0] ?? { error: "role não encontrado em pg_roles" };
      } catch (error) {
        return { error: error instanceof Error ? error.message : "erro ao consultar role" };
      }
    };

    const [appRole, adminRole] = await Promise.all([readRole(prisma), readRole(prismaAdmin)]);

    const coverage = await prisma.$queryRaw<RlsCoverage[]>`
      SELECT (SELECT count(*)::int FROM pg_tables
              WHERE schemaname = 'public' AND rowsecurity = true) AS tables_with_rls,
             (SELECT count(*)::int FROM pg_policies
              WHERE schemaname = 'public')                        AS policies
    `;

    const appBypasses = "bypasses_rls" in appRole ? appRole.bypasses_rls : null;

    return NextResponse.json({
      connection: {
        app: appRole,
        admin: adminRole,
      },
      rls: coverage[0] ?? null,
      env: {
        DATABASE_URL: Boolean(process.env.DATABASE_URL),
        DATABASE_URL_ADMIN: Boolean(process.env.DATABASE_URL_ADMIN),
        DIRECT_URL: Boolean(process.env.DIRECT_URL),
      },
      verdict:
        appBypasses === null
          ? "indeterminado — não foi possível ler o role da conexão"
          : appBypasses
            ? "RLS INATIVO na prática: o role da aplicação tem BYPASSRLS. O isolamento depende apenas do filtro por tenantId no código."
            : "RLS ATIVO: o role da aplicação está sujeito às policies do banco.",
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return handleError(error);
  }
}
