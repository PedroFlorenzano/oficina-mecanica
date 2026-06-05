-- Add billing fields to Tenant
ALTER TABLE "Tenant" ADD COLUMN "plan" TEXT NOT NULL DEFAULT 'trial';
ALTER TABLE "Tenant" ADD COLUMN "planExpiresAt" TIMESTAMP(3);
ALTER TABLE "Tenant" ADD COLUMN "billingStatus" TEXT NOT NULL DEFAULT 'active';
