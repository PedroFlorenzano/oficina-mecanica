-- Campos de catálogo de produto solicitados pelo cliente-piloto (vídeos 23/08)
-- originalCode: código que vem marcado na peça (principal para o usuário)
-- application: veículos/modelos compatíveis (coluna "Aplicação" na listagem)
ALTER TABLE "StockItem" ADD COLUMN IF NOT EXISTS "originalCode" TEXT;
ALTER TABLE "StockItem" ADD COLUMN IF NOT EXISTS "sku" TEXT;
ALTER TABLE "StockItem" ADD COLUMN IF NOT EXISTS "application" TEXT;
ALTER TABLE "StockItem" ADD COLUMN IF NOT EXISTS "observations" TEXT;

-- Custo unitário da peça no orçamento (era perdido ao editar a OS)
ALTER TABLE "OrderPart" ADD COLUMN IF NOT EXISTS "costPrice" DOUBLE PRECISION;
