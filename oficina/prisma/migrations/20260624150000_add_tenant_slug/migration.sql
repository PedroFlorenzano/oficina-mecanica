-- AlterTable: add slug column with temporary default
ALTER TABLE "Tenant" ADD COLUMN "slug" TEXT;

-- Populate existing rows with slug derived from id
UPDATE "Tenant" SET "slug" = REPLACE(id, 'tenant-', '') WHERE "slug" IS NULL;

-- Make column required and unique
ALTER TABLE "Tenant" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");
