export interface RegisterTenantDTO {
  officeName: string;
  cnpj: string;
  phone?: string;
  address?: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
}
