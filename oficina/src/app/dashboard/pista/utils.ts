import { OrderStatus, PistaOrder } from "./types";
import { KANBAN_COLUMNS } from "./config";
import { VALID_TRANSITIONS } from "@/domain/value-objects/OrderStatusTransitions";
import type { PistaStatus } from "@/domain/value-objects/OrderStatusTransitions";

/**
 * Agrupa as OS por status, garantindo que todas as colunas estejam presentes.
 */
export function groupByStatus(orders: PistaOrder[]): Record<OrderStatus, PistaOrder[]> {
  const result = {} as Record<OrderStatus, PistaOrder[]>;
  for (const col of KANBAN_COLUMNS) {
    result[col] = [];
  }
  for (const order of orders) {
    if (result[order.status] !== undefined) {
      result[order.status].push(order);
    }
  }
  return result;
}

/**
 * Filtra as OS pelo mecânico atribuído (mechanicId).
 * Se `mechanicId` for vazio, retorna todas as OS.
 */
export function filterOrders(orders: PistaOrder[], mechanicId: string): PistaOrder[] {
  if (!mechanicId.trim()) return orders;
  return orders.filter((o) =>
    o.services?.some((s) => s.mechanicId === mechanicId)
  );
}

/**
 * Verifica se a transição de status é válida.
 * Reexportada de OrderStatusTransitions.
 */
export function isValidTransition(from: string, to: string): boolean {
  return VALID_TRANSITIONS[from]?.includes(to as PistaStatus) ?? false;
}

/**
 * Formata um valor numérico em reais: R$ 0,00
 */
export function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/**
 * Formata uma data ISO para dd/MM/yyyy.
 */
export function formatDate(iso: string): string {
  const date = new Date(iso);
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

// ─── Indicador de OS parada (item 44) ────────────────────────────────────────

/**
 * Nível de alerta para uma OS parada no mesmo status.
 * `none`: dentro do esperado · `warning`: atenção · `critical`: parada demais.
 */
export type StaleLevel = "none" | "warning" | "critical";

/**
 * Limiares em dias para sinalizar OS parada no status atual.
 *
 * Escolha: a oficina-piloto trabalha com prazo típico de 1 a 2 dias úteis por
 * OS. Um carro parado há 2 dias no mesmo status já merece atenção (warning) e
 * a partir de 4 dias vira alerta forte (critical) — costuma indicar peça
 * atrasada, aprovação pendente ou OS esquecida no quadro. Valores conservadores
 * para não poluir o quadro com alarme falso; ajustáveis aqui num único ponto.
 */
export const STALE_THRESHOLDS_DAYS = {
  warning: 2,
  critical: 4,
} as const;

/**
 * Dias inteiros decorridos desde `since` até `now` (padrão: agora).
 * Nunca negativo. Usa milissegundos para robustez com fuso/horário.
 */
export function daysSince(since: string | Date, now: Date = new Date()): number {
  const start = typeof since === "string" ? new Date(since) : since;
  const diffMs = now.getTime() - start.getTime();
  if (!Number.isFinite(diffMs) || diffMs <= 0) return 0;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Classifica o tempo parado (em dias) segundo os limiares configurados.
 */
export function staleLevel(days: number): StaleLevel {
  if (days >= STALE_THRESHOLDS_DAYS.critical) return "critical";
  if (days >= STALE_THRESHOLDS_DAYS.warning) return "warning";
  return "none";
}

/**
 * Texto acessível para o tempo parado. Ex.: "parada há 3 dias".
 * Retorna string vazia quando não há tempo relevante (0 dias).
 */
export function staleLabel(days: number): string {
  if (days <= 0) return "";
  return days === 1 ? "parada há 1 dia" : `parada há ${days} dias`;
}
