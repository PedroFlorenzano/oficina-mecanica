export interface CommissionFilters {
  mechanicId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export interface EligibleService {
  id: string;
  description: string;
  price: number;
  orderId: string;
  orderNumber: number;
  clientName: string;
  vehiclePlate: string;
}

export interface CommissionSummary {
  totalPending: number;
  totalApproved: number;
  totalPaidMonth: number;
  totalPaidAll: number;
}

export interface CreateCommissionData {
  mechanicId: string;
  tenantId: string;
  startDate: Date;
  endDate: Date;
  commissionRate: number;
  totalBase: number;
  totalCommission: number;
  items: { orderServiceId: string; baseValue: number; commissionValue: number }[];
}

export interface UpdateCommissionStatusData {
  status: "PENDING" | "APPROVED" | "PAID" | "CANCELLED";
  approvedAt?: Date;
  approvedById?: string;
  paidAt?: Date;
  paidById?: string;
  cancelledAt?: Date;
  cancelledById?: string;
  cancelReason?: string;
}

export interface CommissionData {
  id: string;
  mechanicId: string;
  tenantId: string;
  startDate: Date;
  endDate: Date;
  commissionRate: number;
  totalBase: number;
  totalCommission: number;
  status: string;
  approvedAt: Date | null;
  approvedById: string | null;
  paidAt: Date | null;
  paidById: string | null;
  cancelledAt: Date | null;
  cancelledById: string | null;
  cancelReason: string | null;
  createdAt: Date;
  mechanic?: { name: string };
  items?: { id: string; orderServiceId: string; baseValue: number; commissionValue: number }[];
}

export interface ICommissionRepository {
  create(data: CreateCommissionData): Promise<CommissionData>;
  findById(id: string, tenantId: string): Promise<CommissionData | null>;
  findByIdWithItems(id: string, tenantId: string): Promise<CommissionData | null>;
  findAll(tenantId: string, filters: CommissionFilters): Promise<CommissionData[]>;
  findByMechanic(mechanicId: string, tenantId: string, filters: CommissionFilters): Promise<CommissionData[]>;
  findOverlapping(mechanicId: string, tenantId: string, startDate: Date, endDate: Date): Promise<CommissionData | null>;
  updateStatus(id: string, data: UpdateCommissionStatusData): Promise<CommissionData>;
  getEligibleServices(mechanicId: string, tenantId: string, startDate: Date, endDate: Date): Promise<EligibleService[]>;
  getMechanicSummary(mechanicId: string, tenantId: string): Promise<CommissionSummary>;
}
