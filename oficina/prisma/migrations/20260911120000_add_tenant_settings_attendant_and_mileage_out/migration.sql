-- ============================================================
-- Feedback do cliente-piloto (reunião 10/09):
--   item 2  — admin pode editar OS em andamento, por configuração
--   item 8  — atendente responsável pela OS (base da comissão do atendente)
--   item 38 — parâmetro de CAPSLOCK global nos campos digitáveis
--   item 45 — KM de saída na OS (KM-S, como no SysCar)
--
-- Escrita à mão (sem `prisma migrate dev`) porque o Postgres de desenvolvimento
-- estava indisponível. Idempotente: `IF NOT EXISTS` em tudo, seguindo o padrão
-- das migrations anteriores do repositório.
-- ============================================================

-- CreateTable: preferências gerais da oficina
CREATE TABLE IF NOT EXISTS "TenantSettings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "allowEditInProgress" BOOLEAN NOT NULL DEFAULT false,
    "uppercaseInputs" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- DEFAULT acima só para a tabela aceitar INSERT fora do Prisma; o cliente
    -- sempre envia updatedAt por causa do @updatedAt.

    CONSTRAINT "TenantSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TenantSettings_tenantId_key" ON "TenantSettings"("tenantId");

DO $$
BEGIN
  ALTER TABLE "TenantSettings" ADD CONSTRAINT "TenantSettings_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'TenantSettings_tenantId_fkey ja existe';
END
$$;

-- RLS: mesma política das outras tabelas por tenant
ALTER TABLE "TenantSettings" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "tenant_isolation" ON "TenantSettings"
      USING ("tenantId" = current_setting('app.tenant_id', true))
      WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'policy tenant_isolation de TenantSettings ja existe';
END
$$;

-- O role operare_app pode não existir (ver 20260909160000_revoke_orphan_role_login).
-- Best-effort: nunca quebrar o deploy por causa do GRANT.
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'operare_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON "TenantSettings" TO operare_app;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Nao foi possivel conceder permissoes de TenantSettings a operare_app: %', SQLERRM;
END
$$;

-- Item 8: atendente responsável pela OS
ALTER TABLE "ServiceOrder" ADD COLUMN IF NOT EXISTS "attendantId" TEXT;

DO $$
BEGIN
  ALTER TABLE "ServiceOrder" ADD CONSTRAINT "ServiceOrder_attendantId_fkey"
    FOREIGN KEY ("attendantId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'ServiceOrder_attendantId_fkey ja existe';
END
$$;

CREATE INDEX IF NOT EXISTS "ServiceOrder_attendantId_idx" ON "ServiceOrder"("attendantId");

-- Item 45: KM de saída
ALTER TABLE "ServiceOrder" ADD COLUMN IF NOT EXISTS "mileageOut" INTEGER;
