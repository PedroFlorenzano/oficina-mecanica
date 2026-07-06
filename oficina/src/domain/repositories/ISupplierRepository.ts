export interface SupplierData {
  id: string;
  name: string;
  cnpj: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  affiliateUrl: string | null;
  affiliateCode: string | null;
  defaultLeadTimeDays: number;
  active: boolean;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSupplierInput {
  name: string;
  cnpj?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  affiliateUrl?: string | null;
  affiliateCode?: string | null;
  defaultLeadTimeDays?: number;
  active?: boolean;
  tenantId: string;
}

export interface UpdateSupplierInput {
  name?: string;
  cnpj?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  affiliateUrl?: string | null;
  affiliateCode?: string | null;
  defaultLeadTimeDays?: number;
  active?: boolean;
}

export interface ISupplierRepository {
  findById(id: string): Promise<SupplierData | null>;
  findByTenant(tenantId: string): Promise<SupplierData[]>;
  findByCnpj(cnpj: string, tenantId: string): Promise<SupplierData | null>;
  create(data: CreateSupplierInput): Promise<SupplierData>;
  update(id: string, data: UpdateSupplierInput): Promise<SupplierData>;
  delete(id: string): Promise<void>;
  hasLinkedStockItems(id: string): Promise<boolean>;
}
