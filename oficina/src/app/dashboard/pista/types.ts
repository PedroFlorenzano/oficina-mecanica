export type OrderStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "WAITING_PART"
  | "WAITING_APPROVAL"
  | "COMPLETED";

export interface PistaOrder {
  id: string;
  number: number;
  status: OrderStatus;
  totalAmount: number;
  createdAt: string;
  client: { name: string };
  vehicle: { plate: string; brand: string; model: string };
  complaints: { description: string }[];
  createdBy: { name: string };
  services?: { mechanicId?: string | null }[];
}

export interface KanbanColumnData {
  status: OrderStatus;
  label: string;
  color: ColumnColor;
  orders: PistaOrder[];
}

export interface ColumnColor {
  header: string;     // Classe Tailwind bg para o cabeçalho da coluna
  badge: string;      // Classe Tailwind bg para o badge de status
  badgeText: string;  // Classe Tailwind text para o texto do badge
  border: string;     // Classe Tailwind border para destaque ao arrastar
}
