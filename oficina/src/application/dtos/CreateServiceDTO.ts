export interface CreateServiceDTO {
  code?: string;
  description: string;
  category?: string;
  estimatedTime?: number;
  defaultPrice: number;
  pricingType?: string;
  active?: boolean;
}
