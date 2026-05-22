-- CreateTable
CREATE TABLE "FiscalConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "environment" TEXT NOT NULL DEFAULT 'homologation',
    "certificateBase64" TEXT,
    "certificatePassword" TEXT,
    "cnpj" TEXT,
    "inscricaoEstadual" TEXT,
    "inscricaoMunicipal" TEXT,
    "razaoSocial" TEXT,
    "nfeSeries" INTEGER NOT NULL DEFAULT 1,
    "nfseSeries" INTEGER NOT NULL DEFAULT 1,
    "nextNfeNumber" INTEGER NOT NULL DEFAULT 1,
    "nextNfseNumber" INTEGER NOT NULL DEFAULT 1,
    "cityCode" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FiscalConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FiscalInvoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "number" INTEGER,
    "series" INTEGER,
    "accessKey" TEXT,
    "protocolNumber" TEXT,
    "xmlContent" TEXT,
    "pdfUrl" TEXT,
    "totalAmount" REAL NOT NULL,
    "issueDate" DATETIME,
    "cancelDate" DATETIME,
    "cancelReason" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FiscalInvoice_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ServiceOrder" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FiscalInvoiceItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "unitPrice" REAL NOT NULL,
    "totalPrice" REAL NOT NULL,
    "cfop" TEXT,
    "ncm" TEXT,
    "serviceCode" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FiscalInvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "FiscalInvoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "FiscalConfig_tenantId_key" ON "FiscalConfig"("tenantId");
