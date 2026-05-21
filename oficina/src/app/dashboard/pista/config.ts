import { ColumnColor, OrderStatus } from "./types";

export const KANBAN_COLUMNS: OrderStatus[] = [
  "WAITING_APPROVAL",
  "OPEN",
  "WAITING_PART",
  "IN_PROGRESS",
  "COMPLETED",
];

export const STATUS_CONFIG: Record<OrderStatus, { label: string; color: ColumnColor }> = {
  WAITING_APPROVAL: {
    label: "Aguardando Aprovação",
    color: {
      header:    "bg-purple-600",
      badge:     "bg-purple-600",
      badgeText: "text-white",
      border:    "border-purple-400",
    },
  },
  OPEN: {
    label: "Aguardando Início",
    color: {
      header:    "bg-orange-500",
      badge:     "bg-orange-500",
      badgeText: "text-white",
      border:    "border-orange-400",
    },
  },
  WAITING_PART: {
    label: "Aguardando Peças",
    color: {
      header:    "bg-amber-400",
      badge:     "bg-amber-400",
      badgeText: "text-amber-900",
      border:    "border-amber-400",
    },
  },
  IN_PROGRESS: {
    label: "Em Andamento",
    color: {
      header:    "bg-blue-800",
      badge:     "bg-blue-800",
      badgeText: "text-white",
      border:    "border-blue-400",
    },
  },
  COMPLETED: {
    label: "Concluída",
    color: {
      header:    "bg-green-600",
      badge:     "bg-green-600",
      badgeText: "text-white",
      border:    "border-green-400",
    },
  },
};
