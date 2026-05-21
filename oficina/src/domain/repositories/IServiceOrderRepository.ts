export interface OrderData {
  id: string;
  number: number;
  status: string;
  mileage: number;
  notes: string | null;
  cancelReason?: string | null;
  totalAmount: number;
  clientId: string;
  vehicleId: string;
  tenantId: string;
  createdById: string;
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
  services: { description: string; price: number; timeMinutes?: number | null; serviceId?: string | null; mechanicId?: string | null }[];
  parts: { description: string; quantity: number; unitPrice: number; stockItemId?: string | null }[];
}

export interface CreateOrderData {
  mileage: number;
  notes: string | null;
  totalAmount: number;
  clientId: string;
  vehicleId: string;
  tenantId: string;
  createdById: string;
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

export interface IServiceOrderRepository {
  findById(id: string): Promise<any>;
  findAll(tenantId: string): Promise<OrderData[]>;
  findActive(tenantId: string): Promise<any[]>;
  getNextNumber(tenantId: string): Promise<number>;
  createWithComplaints(data: CreateOrderData): Promise<any>;
  createLegacy(data: LegacyCreateOrderData): Promise<any>;
  updateStatus(id: string, status: string, userId: string): Promise<any>;
  findByClientId(clientId: string, tenantId: string): Promise<OrderSummary[]>;
  findByVehicleId(vehicleId: string, tenantId: string): Promise<OrderSummary[]>;
  findOilChangeOrders(vehicleId: string, tenantId: string): Promise<{ mileage: number; createdAt: Date }[]>;
  cancel(id: string, reason: string, userId: string): Promise<any>;
}
