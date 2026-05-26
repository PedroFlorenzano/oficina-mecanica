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
