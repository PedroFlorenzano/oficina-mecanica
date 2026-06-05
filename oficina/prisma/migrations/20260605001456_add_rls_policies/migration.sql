-- ============================================================
-- Row-Level Security (RLS) para isolamento multi-tenant
-- Defense in depth: código filtra por tenantId + banco bloqueia via RLS
-- ============================================================

-- Criar roles se não existirem
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'operare_app') THEN
    CREATE ROLE operare_app LOGIN PASSWORD 'operare_app_pwd';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'operare_admin') THEN
    CREATE ROLE operare_admin LOGIN PASSWORD 'operare_admin_pwd' BYPASSRLS;
  END IF;
END
$$;

-- Dar permissões às roles
GRANT USAGE ON SCHEMA public TO operare_app;
GRANT USAGE ON SCHEMA public TO operare_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO operare_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO operare_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO operare_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO operare_admin;

-- Garantir que futuros objetos também herdem
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO operare_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO operare_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO operare_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO operare_admin;

-- ============================================================
-- TABELAS DIRETAS (com tenantId)
-- ============================================================

-- Tenant (tenant só vê a si mesmo)
ALTER TABLE "Tenant" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Tenant"
  USING ("id" = current_setting('app.current_tenant_id', true));

-- User
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_isolation ON "User"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

-- Client
ALTER TABLE "Client" ENABLE ROW LEVEL SECURITY;
CREATE POLICY client_isolation ON "Client"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

-- Vehicle
ALTER TABLE "Vehicle" ENABLE ROW LEVEL SECURITY;
CREATE POLICY vehicle_isolation ON "Vehicle"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

-- ServiceCatalog
ALTER TABLE "ServiceCatalog" ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_catalog_isolation ON "ServiceCatalog"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

-- ServiceOrder
ALTER TABLE "ServiceOrder" ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_order_isolation ON "ServiceOrder"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

-- StockItem
ALTER TABLE "StockItem" ENABLE ROW LEVEL SECURITY;
CREATE POLICY stock_item_isolation ON "StockItem"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

-- Commission
ALTER TABLE "Commission" ENABLE ROW LEVEL SECURITY;
CREATE POLICY commission_isolation ON "Commission"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

-- WhatsAppConfig
ALTER TABLE "WhatsAppConfig" ENABLE ROW LEVEL SECURITY;
CREATE POLICY whatsapp_config_isolation ON "WhatsAppConfig"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

-- WhatsAppMessage
ALTER TABLE "WhatsAppMessage" ENABLE ROW LEVEL SECURITY;
CREATE POLICY whatsapp_message_isolation ON "WhatsAppMessage"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

-- FiscalConfig
ALTER TABLE "FiscalConfig" ENABLE ROW LEVEL SECURITY;
CREATE POLICY fiscal_config_isolation ON "FiscalConfig"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

-- FiscalInvoice
ALTER TABLE "FiscalInvoice" ENABLE ROW LEVEL SECURITY;
CREATE POLICY fiscal_invoice_isolation ON "FiscalInvoice"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

-- ============================================================
-- TABELAS INDIRETAS (join com tabela pai)
-- ============================================================

-- StockMovement (via StockItem)
ALTER TABLE "StockMovement" ENABLE ROW LEVEL SECURITY;
CREATE POLICY stock_movement_isolation ON "StockMovement"
  USING (EXISTS (
    SELECT 1 FROM "StockItem"
    WHERE "StockItem"."id" = "StockMovement"."stockItemId"
    AND "StockItem"."tenantId" = current_setting('app.current_tenant_id', true)
  ));

-- Complaint (via ServiceOrder)
ALTER TABLE "Complaint" ENABLE ROW LEVEL SECURITY;
CREATE POLICY complaint_isolation ON "Complaint"
  USING (EXISTS (
    SELECT 1 FROM "ServiceOrder"
    WHERE "ServiceOrder"."id" = "Complaint"."orderId"
    AND "ServiceOrder"."tenantId" = current_setting('app.current_tenant_id', true)
  ));

-- OrderService (via ServiceOrder)
ALTER TABLE "OrderService" ENABLE ROW LEVEL SECURITY;
CREATE POLICY order_service_isolation ON "OrderService"
  USING (EXISTS (
    SELECT 1 FROM "ServiceOrder"
    WHERE "ServiceOrder"."id" = "OrderService"."orderId"
    AND "ServiceOrder"."tenantId" = current_setting('app.current_tenant_id', true)
  ));

-- OrderPart (via ServiceOrder)
ALTER TABLE "OrderPart" ENABLE ROW LEVEL SECURITY;
CREATE POLICY order_part_isolation ON "OrderPart"
  USING (EXISTS (
    SELECT 1 FROM "ServiceOrder"
    WHERE "ServiceOrder"."id" = "OrderPart"."orderId"
    AND "ServiceOrder"."tenantId" = current_setting('app.current_tenant_id', true)
  ));

-- StatusHistory (via ServiceOrder)
ALTER TABLE "StatusHistory" ENABLE ROW LEVEL SECURITY;
CREATE POLICY status_history_isolation ON "StatusHistory"
  USING (EXISTS (
    SELECT 1 FROM "ServiceOrder"
    WHERE "ServiceOrder"."id" = "StatusHistory"."orderId"
    AND "ServiceOrder"."tenantId" = current_setting('app.current_tenant_id', true)
  ));

-- Signature (via ServiceOrder)
ALTER TABLE "Signature" ENABLE ROW LEVEL SECURITY;
CREATE POLICY signature_isolation ON "Signature"
  USING (EXISTS (
    SELECT 1 FROM "ServiceOrder"
    WHERE "ServiceOrder"."id" = "Signature"."orderId"
    AND "ServiceOrder"."tenantId" = current_setting('app.current_tenant_id', true)
  ));

-- TimerLog (via OrderService → ServiceOrder)
ALTER TABLE "TimerLog" ENABLE ROW LEVEL SECURITY;
CREATE POLICY timer_log_isolation ON "TimerLog"
  USING (EXISTS (
    SELECT 1 FROM "OrderService"
    JOIN "ServiceOrder" ON "ServiceOrder"."id" = "OrderService"."orderId"
    WHERE "OrderService"."id" = "TimerLog"."orderServiceId"
    AND "ServiceOrder"."tenantId" = current_setting('app.current_tenant_id', true)
  ));

-- TimerAuditLog (via TimerLog → OrderService → ServiceOrder)
ALTER TABLE "TimerAuditLog" ENABLE ROW LEVEL SECURITY;
CREATE POLICY timer_audit_log_isolation ON "TimerAuditLog"
  USING (EXISTS (
    SELECT 1 FROM "TimerLog"
    JOIN "OrderService" ON "OrderService"."id" = "TimerLog"."orderServiceId"
    JOIN "ServiceOrder" ON "ServiceOrder"."id" = "OrderService"."orderId"
    WHERE "TimerLog"."id" = "TimerAuditLog"."timerLogId"
    AND "ServiceOrder"."tenantId" = current_setting('app.current_tenant_id', true)
  ));

-- CommissionItem (via Commission)
ALTER TABLE "CommissionItem" ENABLE ROW LEVEL SECURITY;
CREATE POLICY commission_item_isolation ON "CommissionItem"
  USING (EXISTS (
    SELECT 1 FROM "Commission"
    WHERE "Commission"."id" = "CommissionItem"."commissionId"
    AND "Commission"."tenantId" = current_setting('app.current_tenant_id', true)
  ));

-- FiscalInvoiceItem (via FiscalInvoice)
ALTER TABLE "FiscalInvoiceItem" ENABLE ROW LEVEL SECURITY;
CREATE POLICY fiscal_invoice_item_isolation ON "FiscalInvoiceItem"
  USING (EXISTS (
    SELECT 1 FROM "FiscalInvoice"
    WHERE "FiscalInvoice"."id" = "FiscalInvoiceItem"."invoiceId"
    AND "FiscalInvoice"."tenantId" = current_setting('app.current_tenant_id', true)
  ));

-- ============================================================
-- Prisma _prisma_migrations não deve ter RLS
-- O owner (operare) já tem BYPASSRLS implícito como superuser/owner
-- ============================================================
