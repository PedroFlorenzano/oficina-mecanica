import { PrismaClient } from "@prisma/client";
import { IServiceCatalogRepository, ServiceCatalogData } from "@/domain/repositories/IServiceCatalogRepository";

export class PrismaServiceCatalogRepository implements IServiceCatalogRepository {
  // Defense in depth: RLS também filtra no banco
  constructor(private readonly db: PrismaClient) {}

  async findById(id: string): Promise<ServiceCatalogData | null> {
    return this.db.serviceCatalog.findUnique({
      where: { id },
    }) as unknown as ServiceCatalogData | null;
  }

  async findAll(tenantId: string): Promise<ServiceCatalogData[]> {
    return this.db.serviceCatalog.findMany({
      where: { tenantId },
      orderBy: { description: "asc" },
    }) as unknown as ServiceCatalogData[];
  }

  async create(data: Omit<ServiceCatalogData, "id">): Promise<ServiceCatalogData> {
    return this.db.serviceCatalog.create({ data }) as unknown as ServiceCatalogData;
  }

  async update(id: string, data: Partial<Omit<ServiceCatalogData, "id">>): Promise<ServiceCatalogData> {
    return this.db.serviceCatalog.update({ where: { id }, data }) as unknown as ServiceCatalogData;
  }

  async delete(id: string): Promise<void> {
    await this.db.serviceCatalog.delete({ where: { id } });
  }

  async countOrderServices(id: string): Promise<number> {
    return this.db.orderService.count({ where: { serviceId: id } });
  }
}
