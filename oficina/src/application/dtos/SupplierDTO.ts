export interface CreateSupplierDTO {
  name: string;
  cnpj?: string;
  phone?: string;
  email?: string;
  website?: string;
  affiliateUrl?: string;
  affiliateCode?: string;
  defaultLeadTimeDays?: number;
}

export interface UpdateSupplierDTO {
  name?: string;
  cnpj?: string;
  phone?: string;
  email?: string;
  website?: string;
  affiliateUrl?: string;
  affiliateCode?: string;
  defaultLeadTimeDays?: number;
  active?: boolean;
}
