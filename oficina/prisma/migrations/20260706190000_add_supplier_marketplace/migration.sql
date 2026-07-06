-- CreateTable: SupplierSearchConfig
CREATE TABLE "SupplierSearchConfig" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "searchUrlTemplate" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierSearchConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable: SupplierClick
CREATE TABLE "SupplierClick" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "searchQuery" TEXT NOT NULL,
    "productUrl" TEXT NOT NULL,
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierClick_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupplierSearchConfig_supplierId_idx" ON "SupplierSearchConfig"("supplierId");

-- CreateIndex
CREATE INDEX "SupplierClick_tenantId_createdAt_idx" ON "SupplierClick"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "SupplierClick_supplierId_createdAt_idx" ON "SupplierClick"("supplierId", "createdAt");

-- AddForeignKey
ALTER TABLE "SupplierSearchConfig" ADD CONSTRAINT "SupplierSearchConfig_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierClick" ADD CONSTRAINT "SupplierClick_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RLS: SupplierSearchConfig (via supplier tenant)
ALTER TABLE "SupplierSearchConfig" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "supplier_search_config_isolation" ON "SupplierSearchConfig"
    USING (EXISTS (SELECT 1 FROM "Supplier" s WHERE s."id" = "supplierId" AND s."tenantId" = current_setting('app.tenant_id', true)));

GRANT SELECT, INSERT, UPDATE, DELETE ON "SupplierSearchConfig" TO operare_app;

-- RLS: SupplierClick
ALTER TABLE "SupplierClick" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "supplier_click_tenant_isolation" ON "SupplierClick"
    USING ("tenantId" = current_setting('app.tenant_id', true))
    WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

GRANT SELECT, INSERT ON "SupplierClick" TO operare_app;
