import { prisma } from "../database/prisma";
import { IClientRepository, ClientData } from "@/domain/repositories/IClientRepository";

export class PrismaClientRepository implements IClientRepository {
  async findById(id: string, tenantId: string): Promise<ClientData | null> {
    return prisma.client.findFirst({
      where: { id, tenantId },
      include: {
        vehicles: { select: { id: true, plate: true, brand: true, model: true, year: true, color: true, mileage: true } },
        _count: { select: { vehicles: true, orders: true } },
      },
    }) as Promise<ClientData | null>;
  }

  async findByDocument(document: string, tenantId: string): Promise<ClientData | null> {
    return prisma.client.findFirst({
      where: { document, tenantId },
    }) as Promise<ClientData | null>;
  }

  async search(query: string, tenantId: string): Promise<ClientData[]> {
    return prisma.client.findMany({
      where: {
        tenantId,
        OR: [
          { name: { contains: query } },
          { document: { contains: query } },
          { phone: { contains: query } },
          { vehicles: { some: { plate: { contains: query } } } },
        ],
      },
      include: {
        vehicles: { select: { id: true, plate: true, brand: true, model: true, year: true, color: true, mileage: true } },
        _count: { select: { vehicles: true, orders: true } },
      },
      orderBy: { name: "asc" },
    }) as unknown as ClientData[];
  }

  async findAll(tenantId: string): Promise<ClientData[]> {
    return prisma.client.findMany({
      where: { tenantId },
      include: {
        vehicles: { select: { id: true, plate: true, brand: true, model: true, year: true, color: true, mileage: true } },
        _count: { select: { vehicles: true, orders: true } },
      },
      orderBy: { name: "asc" },
    }) as unknown as ClientData[];
  }

  async create(data: Omit<ClientData, "id" | "vehicles" | "_count">): Promise<ClientData> {
    return prisma.client.create({ data }) as unknown as ClientData;
  }

  async update(id: string, data: Partial<Omit<ClientData, "id" | "vehicles" | "_count">>): Promise<ClientData> {
    return prisma.client.update({ where: { id }, data }) as unknown as ClientData;
  }
}
