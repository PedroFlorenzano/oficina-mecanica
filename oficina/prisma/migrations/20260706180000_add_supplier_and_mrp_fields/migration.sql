-- CreateTable: Supplier
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cnpj" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "affiliateUrl" TEXT,
    "affiliateCode" TEXT,
    "defaultLeadTimeDays" INTEGER NOT NULL DEFAULT 3,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- AddColumn: StockItem.supplierId
ALTER TABLE "StockItem" ADD COLUMN "supplierId" TEXT;

-- AddColumn: StockItem.leadTimeDays
ALTER TABLE "StockItem" ADD COLUMN "leadTimeDays" INTEGER;

-- AddColumn: ServiceOrder.estimatedDelivery
ALTER TABLE "ServiceOrder" ADD COLUMN "estimatedDelivery" TIMESTAMP(3);

-- AddColumn: ServiceOrder.estimatedDaysTotal
ALTER TABLE "ServiceOrder" ADD COLUMN "estimatedDaysTotal" INTEGER;

-- AddColumn: ServiceOrder.estimatedDaysReason
ALTER TABLE "ServiceOrder" ADD COLUMN "estimatedDaysReason" TEXT;

-- AddColumn: ScheduleConfig.defaultPartLeadDays
ALTER TABLE "ScheduleConfig" ADD COLUMN "defaultPartLeadDays" INTEGER NOT NULL DEFAULT 5;

-- AddColumn: ScheduleConfig.mechanicCount
ALTER TABLE "ScheduleConfig" ADD COLUMN "mechanicCount" INTEGER NOT NULL DEFAULT 2;

-- CreateIndex
CREATE INDEX "Supplier_tenantId_active_idx" ON "Supplier"("tenantId", "active");

-- CreateIndex (unique cnpj per tenant, only when cnpj is not null)
CREATE UNIQUE INDEX "Supplier_cnpj_tenantId_key" ON "Supplier"("cnpj", "tenantId");

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockItem" ADD CONSTRAINT "StockItem_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RLS: Supplier
ALTER TABLE "Supplier" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "supplier_tenant_isolation" ON "Supplier"
    USING ("tenantId" = current_setting('app.tenant_id', true))
    WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

GRANT SELECT, INSERT, UPDATE, DELETE ON "Supplier" TO operare_app;
