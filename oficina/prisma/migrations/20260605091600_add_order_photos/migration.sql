-- CreateEnum
CREATE TYPE "PhotoCategory" AS ENUM ('BEFORE', 'AFTER', 'DAMAGE');

-- CreateTable
CREATE TABLE "OrderPhoto" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "category" "PhotoCategory" NOT NULL,
    "description" TEXT,
    "filePath" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderPhoto_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "OrderPhoto" ADD CONSTRAINT "OrderPhoto_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ServiceOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderPhoto" ADD CONSTRAINT "OrderPhoto_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RLS Policy (indirect via ServiceOrder.tenantId)
ALTER TABLE "OrderPhoto" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_photo_tenant_isolation" ON "OrderPhoto"
    USING (
        EXISTS (
            SELECT 1 FROM "ServiceOrder"
            WHERE "ServiceOrder"."id" = "OrderPhoto"."orderId"
            AND "ServiceOrder"."tenantId" = current_setting('app.current_tenant_id', true)
        )
    );

-- Grant to app role
GRANT SELECT, INSERT, DELETE ON "OrderPhoto" TO operare_app;
