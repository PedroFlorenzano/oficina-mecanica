export interface OrderData {
  id: string;
  number: number;
  status: string;
  mileage: number;
  mileageOut?: number | null;
  notes: string | null;
  cancelReason?: string | null;
  totalAmount: number;
  clientId: string;
  vehicleId: string;
  tenantId: string;
  createdById: string;
  attendantId?: string | null;
  createdAt: Date;
  client?: { name: string };
  vehicle?: { plate: string; model: string; brand?: string };
}

export interface OrderSummary {
  id: string;
  number: number;
  status: string;
  totalAmount: number;
  createdAt: Date;
  vehicle?: { plate: string };
  client?: { name: string };
}

export interface ComplaintInput {
  description: string;
  services: { description: string; price: number; timeMinutes?: number | null; serviceId?: string | null; mechanicId?: string | null; commissionRate?: number | null; approved?: boolean }[];
  parts: { description: string; quantity: number; unitPrice: number; costPrice?: number | null; stockItemId?: string | null; approved?: boolean }[];
}

export interface CreateOrderData {
  mileage: number;
  notes: string | null;
  totalAmount: number;
  clientId: string;
  vehicleId: string;
  tenantId: string;
  createdById: string;
  attendantId?: string | null;
  mileageOut?: number | null;
  complaints: ComplaintInput[];
}

export interface LegacyCreateOrderData {
  mileage: number;
  notes: string | null;
  clientId: string;
  vehicleId: string;
  tenantId: string;
  createdById: string;
  services: { description: string; price: number; serviceId?: string | null; mechanicId?: string | null }[];
  parts?: { description: string; quantity: number; unitPrice: number; stockItemId?: string | null }[];
}

export interface OrderServiceDetail {
  id: string;
  description: string;
  price: number;
  timeMinutes: number | null;
  serviceId: string | null;
  mechanicId: string | null;
  mechanic?: { name: string } | null;
  approved: boolean;
}

export interface OrderPartDetail {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  costPrice: number | null;
  totalPrice: number;
  stockItemId: string | null;
  used: boolean;
  stockItem?: { supplier: string | null; brand: string | null; code?: string | null; originalCode?: string | null } | null;
  approved: boolean;
}

export interface ComplaintDetail {
  id: string;
  number: number;
  description: string;
  services: OrderServiceDetail[];
  parts: OrderPartDetail[];
}

export interface OrderDetail extends OrderData {
  client: { name: string; document: string; phone: string | null };
  vehicle: { plate: string; model: string; brand: string; mileage: number };
  attendant?: { id: string; name: string } | null;
  complaints: ComplaintDetail[];
  services?: OrderServiceDetail[];
  parts?: OrderPartDetail[];
  statusHistory?: { fromStatus: string | null; toStatus: string; createdAt: Date; user?: { name: string } }[];
}

/** Uma entrada do histórico de status, usada para calcular o tempo em cada status. */
export interface StatusHistoryEntry {
  fromStatus: string | null;
  toStatus: string;
  createdAt: Date;
}

export interface ActiveOrder {
  id: string;
  number: number;
  status: string;
  totalAmount: number;
  createdAt: Date;
  client: { name: string };
  vehicle: { plate: string; model: string; brand?: string };
  complaints?: { description: string }[];
  createdBy?: { name: string };
  services?: { mechanicId?: string | null }[];
}

export interface IServiceOrderRepository {
  findById(id: string): Promise<OrderDetail | null>;
  findAll(tenantId: string): Promise<OrderData[]>;
  findActive(tenantId: string): Promise<ActiveOrder[]>;
  getNextNumber(tenantId: string): Promise<number>;
  createWithComplaints(data: CreateOrderData): Promise<OrderData | null>;
  createLegacy(data: LegacyCreateOrderData): Promise<OrderData>;
  updateStatus(id: string, status: string, userId: string): Promise<OrderData | null>;
  replaceComplaints(orderId: string, tenantId: string, complaints: ComplaintInput[], totalAmount: number, notes: string | null, extra?: { attendantId?: string | null; mileageOut?: number | null }): Promise<OrderData>;
  /** Registra uma entrada no StatusHistory sem alterar o status (auditoria de edição). */
  recordStatusHistory(orderId: string, status: string, userId: string): Promise<void>;
  /** Retorna o StatusHistory da OS em ordem cronológica crescente. */
  getStatusHistory(orderId: string): Promise<StatusHistoryEntry[]>;
  setItemApproval(orderId: string, itemType: "service" | "part", itemId: string, approved: boolean): Promise<OrderData>;
  findByClientId(clientId: string, tenantId: string): Promise<OrderSummary[]>;
  findByVehicleId(vehicleId: string, tenantId: string): Promise<OrderSummary[]>;
  findOilChangeOrders(vehicleId: string, tenantId: string): Promise<{ mileage: number; createdAt: Date }[]>;
  cancel(id: string, reason: string, userId: string): Promise<OrderData | null>;
}
