-- Adiciona flag "approved" (aprovado pelo cliente) em OrderService e OrderPart
ALTER TABLE "OrderService" ADD COLUMN IF NOT EXISTS "approved" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "OrderPart" ADD COLUMN IF NOT EXISTS "approved" BOOLEAN NOT NULL DEFAULT true;
