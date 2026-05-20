-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN "fuel" TEXT;
ALTER TABLE "Vehicle" ADD COLUMN "yearModel" INTEGER;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ServiceCatalog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT,
    "description" TEXT NOT NULL,
    "category" TEXT,
    "estimatedTime" INTEGER,
    "defaultPrice" REAL NOT NULL,
    "pricingType" TEXT NOT NULL DEFAULT 'VALUE',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "tenantId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ServiceCatalog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ServiceCatalog" ("active", "category", "createdAt", "defaultPrice", "description", "estimatedTime", "id", "tenantId", "updatedAt") SELECT "active", "category", "createdAt", "defaultPrice", "description", "estimatedTime", "id", "tenantId", "updatedAt" FROM "ServiceCatalog";
DROP TABLE "ServiceCatalog";
ALTER TABLE "new_ServiceCatalog" RENAME TO "ServiceCatalog";
CREATE TABLE "new_StockItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "barcode" TEXT,
    "description" TEXT NOT NULL,
    "brand" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'UN',
    "minQuantity" INTEGER NOT NULL DEFAULT 0,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "location" TEXT,
    "costPrice" REAL NOT NULL DEFAULT 0,
    "sellPrice" REAL NOT NULL DEFAULT 0,
    "avgCost" REAL NOT NULL DEFAULT 0,
    "profitMargin" REAL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "tenantId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StockItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_StockItem" ("avgCost", "barcode", "brand", "code", "costPrice", "createdAt", "description", "id", "location", "minQuantity", "quantity", "sellPrice", "tenantId", "unit", "updatedAt") SELECT "avgCost", "barcode", "brand", "code", "costPrice", "createdAt", "description", "id", "location", "minQuantity", "quantity", "sellPrice", "tenantId", "unit", "updatedAt" FROM "StockItem";
DROP TABLE "StockItem";
ALTER TABLE "new_StockItem" RENAME TO "StockItem";
CREATE UNIQUE INDEX "StockItem_code_tenantId_key" ON "StockItem"("code", "tenantId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
