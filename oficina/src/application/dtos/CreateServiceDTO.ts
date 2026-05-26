export interface CreateServiceDTO {
  code?: string;
  description: string;
  category?: string;
  estimatedTime?: number;
  defaultPrice: number;
  pricingType?: string;
  commissionRate?: string | number;
  active?: boolean;
}
