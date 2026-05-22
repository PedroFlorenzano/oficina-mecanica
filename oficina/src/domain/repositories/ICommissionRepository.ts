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

export interface ICommissionRepository {
  create(data: CreateCommissionData): Promise<any>;
  findById(id: string, tenantId: string): Promise<any | null>;
  findByIdWithItems(id: string, tenantId: string): Promise<any | null>;
  findAll(tenantId: string, filters: CommissionFilters): Promise<any[]>;
  findByMechanic(mechanicId: string, tenantId: string, filters: CommissionFilters): Promise<any[]>;
  findOverlapping(mechanicId: string, tenantId: string, startDate: Date, endDate: Date): Promise<any | null>;
  updateStatus(id: string, data: UpdateCommissionStatusData): Promise<any>;
  getEligibleServices(mechanicId: string, tenantId: string, startDate: Date, endDate: Date): Promise<EligibleService[]>;
  getMechanicSummary(mechanicId: string, tenantId: string): Promise<CommissionSummary>;
}
