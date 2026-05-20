import { prisma } from "../database/prisma";
import { IServiceCatalogRepository, ServiceCatalogData } from "@/domain/repositories/IServiceCatalogRepository";

export class PrismaServiceCatalogRepository implements IServiceCatalogRepository {
  async findById(id: string): Promise<ServiceCatalogData | null> {
    return prisma.serviceCatalog.findUnique({
      where: { id },
    }) as unknown as ServiceCatalogData | null;
  }

  async findAll(tenantId: string): Promise<ServiceCatalogData[]> {
    return prisma.serviceCatalog.findMany({
      where: { tenantId },
      orderBy: { description: "asc" },
    }) as unknown as ServiceCatalogData[];
  }

  async create(data: Omit<ServiceCatalogData, "id">): Promise<ServiceCatalogData> {
    return prisma.serviceCatalog.create({ data }) as unknown as ServiceCatalogData;
  }

  async update(id: string, data: Partial<Omit<ServiceCatalogData, "id">>): Promise<ServiceCatalogData> {
    return prisma.serviceCatalog.update({ where: { id }, data }) as unknown as ServiceCatalogData;
  }

  async delete(id: string): Promise<void> {
    await prisma.serviceCatalog.delete({ where: { id } });
  }

  async countOrderServices(id: string): Promise<number> {
    return prisma.orderService.count({ where: { serviceId: id } });
  }
}
