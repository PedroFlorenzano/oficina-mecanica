import { PrismaClient } from "@prisma/client";
import { IClientRepository, ClientData } from "@/domain/repositories/IClientRepository";

export class PrismaClientRepository implements IClientRepository {
  // Defense in depth: RLS também filtra no banco
  constructor(private readonly db: PrismaClient) {}

  async findById(id: string, tenantId: string): Promise<ClientData | null> {
    return this.db.client.findFirst({
      where: { id, tenantId },
      include: {
        vehicles: { select: { id: true, plate: true, brand: true, model: true, year: true, color: true, mileage: true } },
        _count: { select: { vehicles: true, orders: true } },
      },
    }) as Promise<ClientData | null>;
  }

  async findByDocument(document: string, tenantId: string): Promise<ClientData | null> {
    return this.db.client.findFirst({
      where: { document, tenantId },
    }) as Promise<ClientData | null>;
  }

  async search(query: string, tenantId: string): Promise<ClientData[]> {
    return this.db.client.findMany({
      where: {
        tenantId,
        active: true,
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

  async findAll(tenantId: string, activeOnly?: boolean): Promise<ClientData[]> {
    const whereActive = activeOnly === false ? undefined : { active: true };

    return this.db.client.findMany({
      where: { tenantId, ...whereActive },
      include: {
        vehicles: { select: { id: true, plate: true, brand: true, model: true, year: true, color: true, mileage: true } },
        _count: { select: { vehicles: true, orders: true } },
      },
      orderBy: { name: "asc" },
    }) as unknown as ClientData[];
  }

  async create(data: Omit<ClientData, "id" | "vehicles" | "_count" | "active"> & { active?: boolean }): Promise<ClientData> {
    return this.db.client.create({ data }) as unknown as ClientData;
  }

  async update(id: string, data: Partial<Omit<ClientData, "id" | "vehicles" | "_count">>): Promise<ClientData> {
    return this.db.client.update({ where: { id }, data }) as unknown as ClientData;
  }

  async deactivate(id: string): Promise<ClientData> {
    return this.db.client.update({
      where: { id },
      data: { active: false },
    }) as unknown as ClientData;
  }
}
