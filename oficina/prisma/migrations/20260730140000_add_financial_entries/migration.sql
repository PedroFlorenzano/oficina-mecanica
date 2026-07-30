-- CreateEnum
CREATE TYPE "FinancialEntryType" AS ENUM ('PAYABLE', 'RECEIVABLE');

-- CreateEnum
CREATE TYPE "FinancialEntryStatus" AS ENUM ('PENDING', 'OVERDUE', 'PAID');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('RENT', 'ENERGY', 'WATER', 'INTERNET', 'INSURANCE', 'ACCOUNTING', 'SALARY', 'PARTS_SUPPLIER', 'TOOLS', 'MAINTENANCE', 'MARKETING', 'TAX', 'SOFTWARE', 'FUEL', 'OTHER_FIXED', 'OTHER_VARIABLE');

-- CreateTable
CREATE TABLE "FinancialEntry" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "FinancialEntryType" NOT NULL DEFAULT 'PAYABLE',
    "category" "ExpenseCategory" NOT NULL,
    "status" "FinancialEntryStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DOUBLE PRECISION NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "paidAmount" DOUBLE PRECISION,
    "installment" INTEGER NOT NULL DEFAULT 1,
    "totalInstallments" INTEGER NOT NULL DEFAULT 1,
    "supplier" TEXT,
    "notes" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FinancialEntry_tenantId_status_dueDate_idx" ON "FinancialEntry"("tenantId", "status", "dueDate");

-- CreateIndex
CREATE INDEX "FinancialEntry_tenantId_category_idx" ON "FinancialEntry"("tenantId", "category");

-- CreateIndex
CREATE INDEX "FinancialEntry_tenantId_dueDate_idx" ON "FinancialEntry"("tenantId", "dueDate");

-- AddForeignKey
ALTER TABLE "FinancialEntry" ADD CONSTRAINT "FinancialEntry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RLS Policy (Row Level Security)
ALTER TABLE "FinancialEntry" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON "FinancialEntry"
    USING ("tenantId" = current_setting('app.tenant_id', true))
    WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

-- Grant to app role
GRANT SELECT, INSERT, UPDATE, DELETE ON "FinancialEntry" TO operare_app;
