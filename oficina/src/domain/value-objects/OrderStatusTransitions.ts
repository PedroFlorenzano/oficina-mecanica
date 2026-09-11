export const PISTA_STATUSES = [
  "OPEN",
  "IN_PROGRESS",
  "WAITING_PART",
  "WAITING_APPROVAL",
  "COMPLETED",
] as const;

/**
 * Todos os status possíveis de uma OS, na ordem do fluxo.
 * A Pista trabalha com um subconjunto (`PISTA_STATUSES`).
 */
export const ORDER_STATUSES = [
  ...PISTA_STATUSES,
  "DELIVERED",
  "CANCELLED",
] as const;

/** Status que encerram a OS: dali não se muda mais de status. */
export const TERMINAL_STATUSES = ["DELIVERED", "CANCELLED"] as const;

export type PistaStatus = typeof PISTA_STATUSES[number];

export const VALID_TRANSITIONS: Record<string, PistaStatus[]> = {
  WAITING_APPROVAL: ["OPEN", "COMPLETED"],
  OPEN:             ["WAITING_PART", "IN_PROGRESS"],
  WAITING_PART:     ["OPEN", "IN_PROGRESS"],
  IN_PROGRESS:      ["WAITING_PART", "COMPLETED"],
  COMPLETED:        [],
};
