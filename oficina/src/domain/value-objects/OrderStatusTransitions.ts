export const PISTA_STATUSES = [
  "OPEN",
  "IN_PROGRESS",
  "WAITING_PART",
  "WAITING_APPROVAL",
  "COMPLETED",
] as const;

export type PistaStatus = typeof PISTA_STATUSES[number];

export const VALID_TRANSITIONS: Record<string, PistaStatus[]> = {
  WAITING_APPROVAL: ["OPEN", "COMPLETED"],
  OPEN:             ["WAITING_PART", "IN_PROGRESS"],
  WAITING_PART:     ["OPEN", "IN_PROGRESS"],
  IN_PROGRESS:      ["WAITING_PART", "COMPLETED"],
  COMPLETED:        [],
};
