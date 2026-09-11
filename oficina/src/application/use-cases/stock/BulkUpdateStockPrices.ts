import { IStockItemRepository, StockItemData, BulkPriceFilter } from "@/domain/repositories/IStockItemRepository";
import { ValidationError } from "@/domain/errors/DomainError";

export type BulkPriceMode = "percent" | "margin";

export interface BulkUpdateStockPricesDTO {
  /** Seleção: ids explícitos, marca, ou trecho de descrição/código */
  filter: BulkPriceFilter;
  /** "percent" ajusta o preço de venda atual; "margin" recalcula a partir do custo */
  mode: BulkPriceMode;
  /**
   * percent: variação percentual sobre o sellPrice atual (ex.: 10 = +10%, -5 = -5%)
   * margin: nova margem de lucro sobre o custo, em % (ex.: 40 = custo × 1,40)
   */
  value: number;
}

export interface BulkUpdateStockPricesResult {
  affected: number;
}

/**
 * Arredonda para 2 casas decimais evitando erros de ponto flutuante.
 */
function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Calcula o novo preço de venda de um item — função pura e testável.
 *
 * - percent: sellPrice × (1 + value/100)
 * - margin:  costPrice × (1 + value/100)  (usa avgCost quando costPrice é 0)
 *
 * Nunca retorna valor negativo (piso em 0).
 */
export function computeNewSellPrice(item: StockItemData, mode: BulkPriceMode, value: number): number {
  if (mode === "percent") {
    return round2(Math.max(0, item.sellPrice * (1 + value / 100)));
  }
  // mode === "margin"
  const base = item.costPrice > 0 ? item.costPrice : item.avgCost;
  return round2(Math.max(0, base * (1 + value / 100)));
}

/**
 * Item 17 — atualização em massa de preços de estoque.
 * Seleciona itens por marca, trecho de descrição/código ou lista de ids,
 * e aplica ajuste por percentual ou por nova margem.
 */
export class BulkUpdateStockPrices {
  constructor(private stockRepo: IStockItemRepository) {}

  async execute(input: BulkUpdateStockPricesDTO, tenantId: string): Promise<BulkUpdateStockPricesResult> {
    const { filter, mode, value } = input;

    if (mode !== "percent" && mode !== "margin") {
      throw new ValidationError("Modo de ajuste inválido");
    }
    if (typeof value !== "number" || Number.isNaN(value)) {
      throw new ValidationError("Informe um valor numérico para o ajuste");
    }
    if (mode === "margin" && value < 0) {
      throw new ValidationError("A margem não pode ser negativa");
    }
    if (mode === "percent" && value <= -100) {
      throw new ValidationError("O ajuste percentual não pode zerar ou inverter o preço");
    }

    const hasFilter =
      (filter?.ids && filter.ids.length > 0) ||
      (filter?.brand && filter.brand.trim() !== "") ||
      (filter?.term && filter.term.trim() !== "");
    if (!hasFilter) {
      throw new ValidationError("Selecione ao menos um critério: marca, descrição/código ou itens");
    }

    if (!this.stockRepo.findForBulk || !this.stockRepo.bulkUpdatePrices) {
      throw new ValidationError("Operação em lote não suportada por este repositório");
    }

    const items = await this.stockRepo.findForBulk(tenantId, filter);
    if (items.length === 0) {
      return { affected: 0 };
    }

    const updates = items.map((item) => {
      const sellPrice = computeNewSellPrice(item, mode, value);
      // Ao aplicar nova margem, persistimos também a margem no item
      return mode === "margin"
        ? { id: item.id, sellPrice, profitMargin: value }
        : { id: item.id, sellPrice };
    });

    const affected = await this.stockRepo.bulkUpdatePrices(tenantId, updates);
    return { affected };
  }
}
