import { PrismaClient } from "@prisma/client";
import { IVehicleRepository, VehicleData, VehicleWithClient } from "@/domain/repositories/IVehicleRepository";

export class PrismaVehicleRepository implements IVehicleRepository {
  // Defense in depth: RLS também filtra no banco
  constructor(private readonly db: PrismaClient) {}

  async findById(id: string): Promise<VehicleData | null> {
    return this.db.vehicle.findUnique({
      where: { id },
      include: { client: { select: { id: true, name: true } } },
    }) as unknown as VehicleData | null;
  }

  async findByPlate(plate: string, tenantId: string): Promise<VehicleData | null> {
    return this.db.vehicle.findFirst({
      where: { plate, tenantId },
    }) as unknown as VehicleData | null;
  }

  async findByPlateExcluding(plate: string, tenantId: string, excludeId: string): Promise<VehicleData | null> {
    return this.db.vehicle.findFirst({
      where: { plate, tenantId, NOT: { id: excludeId } },
    }) as unknown as VehicleData | null;
  }

  async search(query: string, tenantId: string): Promise<VehicleData[]> {
    return this.db.vehicle.findMany({
      where: {
        tenantId,
        OR: [
          { plate: { contains: query } },
          { model: { contains: query } },
          { brand: { contains: query } },
          { client: { name: { contains: query } } },
        ],
      },
      include: { client: { select: { id: true, name: true } } },
      orderBy: { plate: "asc" },
    }) as unknown as VehicleData[];
  }

  async findAll(tenantId: string): Promise<VehicleData[]> {
    return this.db.vehicle.findMany({
      where: { tenantId },
      include: { client: { select: { id: true, name: true } } },
      orderBy: { plate: "asc" },
    }) as unknown as VehicleData[];
  }

  async findWithReminderEnabled(tenantId: string): Promise<VehicleWithClient[]> {
    return this.db.vehicle.findMany({
      where: { tenantId, oilReminderEnabled: true },
      include: { client: { select: { name: true, phone: true } } },
    }) as unknown as VehicleWithClient[];
  }

  async create(data: Omit<VehicleData, "id" | "client">): Promise<VehicleData> {
    return this.db.vehicle.create({
      data,
      include: { client: { select: { id: true, name: true } } },
    }) as unknown as VehicleData;
  }

  async update(id: string, data: Partial<Omit<VehicleData, "id" | "client">>): Promise<VehicleData> {
    return this.db.vehicle.update({
      where: { id },
      data,
      include: { client: { select: { id: true, name: true } } },
    }) as unknown as VehicleData;
  }

  async updateMileage(id: string, mileage: number): Promise<void> {
    await this.db.vehicle.update({
      where: { id },
      data: { mileage },
    });
  }

  async delete(id: string): Promise<void> {
    await this.db.vehicle.delete({ where: { id } });
  }

  async countOrders(id: string): Promise<number> {
    return this.db.serviceOrder.count({ where: { vehicleId: id } });
  }
}
