export interface FinancialEntryData {
  id: string;
  description: string;
  type: "PAYABLE" | "RECEIVABLE";
  category: string;
  status: "PENDING" | "OVERDUE" | "PAID";
  amount: number;
  dueDate: Date;
  paidAt: Date | null;
  paidAmount: number | null;
  installment: number;
  totalInstallments: number;
  supplier: string | null;
  notes: string | null;
  tenantId: string;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateFinancialEntryInput {
  description: string;
  type: "PAYABLE" | "RECEIVABLE";
  category: string;
  amount: number;
  dueDate: Date;
  installment?: number;
  totalInstallments?: number;
  supplier?: string | null;
  notes?: string | null;
  tenantId: string;
  createdBy?: string | null;
}

export interface UpdateFinancialEntryInput {
  description?: string;
  category?: string;
  amount?: number;
  dueDate?: Date;
  supplier?: string | null;
  notes?: string | null;
}

export interface FinancialEntryFilters {
  status?: "PENDING" | "OVERDUE" | "PAID" | "ALL";
  category?: string;
  startDate?: Date;
  endDate?: Date;
  supplier?: string;
}

export interface IFinancialEntryRepository {
  create(data: CreateFinancialEntryInput): Promise<FinancialEntryData>;
  findById(id: string, tenantId: string): Promise<FinancialEntryData | null>;
  findAll(tenantId: string, filters?: FinancialEntryFilters): Promise<FinancialEntryData[]>;
  update(id: string, data: UpdateFinancialEntryInput): Promise<FinancialEntryData>;
  markAsPaid(id: string, paidAt: Date, paidAmount?: number): Promise<FinancialEntryData>;
  prorrogate(id: string, newDueDate: Date): Promise<FinancialEntryData>;
  delete(id: string): Promise<void>;
  getSummary(tenantId: string, startDate: Date, endDate: Date): Promise<{
    totalPayable: number;
    totalReceivable: number;
    totalPaid: number;
    totalOverdue: number;
    byCategory: Array<{ category: string; total: number }>;
  }>;
}
