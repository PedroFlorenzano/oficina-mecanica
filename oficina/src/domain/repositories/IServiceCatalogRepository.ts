export interface ServiceCatalogData {
  id: string;
  code: string | null;
  description: string;
  category: string | null;
  estimatedTime: number | null;
  defaultPrice: number;
  pricingType: string;
  commissionRate: number | null;
  warrantyDays: number | null;
  active: boolean;
  tenantId: string;
}

export interface IServiceCatalogRepository {
  findById(id: string): Promise<ServiceCatalogData | null>;
  findAll(tenantId: string): Promise<ServiceCatalogData[]>;
  create(data: Omit<ServiceCatalogData, "id">): Promise<ServiceCatalogData>;
  update(id: string, data: Partial<Omit<ServiceCatalogData, "id">>): Promise<ServiceCatalogData>;
  delete(id: string): Promise<void>;
  countOrderServices(id: string): Promise<number>;
}
