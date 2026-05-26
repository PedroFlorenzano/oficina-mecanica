/**
 * Formata valor numérico para moeda brasileira (R$ 1.234,56)
 */
export function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
