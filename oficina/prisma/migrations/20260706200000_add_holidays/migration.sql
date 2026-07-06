-- CreateTable: Holiday
CREATE TABLE "Holiday" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "recurring" BOOLEAN NOT NULL DEFAULT false,
    "configId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Holiday_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Holiday_configId_date_idx" ON "Holiday"("configId", "date");

-- AddForeignKey
ALTER TABLE "Holiday" ADD CONSTRAINT "Holiday_configId_fkey" FOREIGN KEY ("configId") REFERENCES "ScheduleConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS: Holiday (via config tenant)
ALTER TABLE "Holiday" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "holiday_isolation" ON "Holiday"
    USING (EXISTS (SELECT 1 FROM "ScheduleConfig" sc WHERE sc."id" = "configId" AND sc."tenantId" = current_setting('app.tenant_id', true)));

GRANT SELECT, INSERT, UPDATE, DELETE ON "Holiday" TO operare_app;
