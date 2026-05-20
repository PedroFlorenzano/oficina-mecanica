import { prisma } from "../database/prisma";
import { IVehicleRepository, VehicleData } from "@/domain/repositories/IVehicleRepository";

export class PrismaVehicleRepository implements IVehicleRepository {
  async findById(id: string): Promise<VehicleData | null> {
    return prisma.vehicle.findUnique({
      where: { id },
      include: { client: { select: { id: true, name: true } } },
    }) as unknown as VehicleData | null;
  }

  async findByPlate(plate: string, tenantId: string): Promise<VehicleData | null> {
    return prisma.vehicle.findFirst({
      where: { plate, tenantId },
    }) as unknown as VehicleData | null;
  }

  async findByPlateExcluding(plate: string, tenantId: string, excludeId: string): Promise<VehicleData | null> {
    return prisma.vehicle.findFirst({
      where: { plate, tenantId, NOT: { id: excludeId } },
    }) as unknown as VehicleData | null;
  }

  async search(query: string, tenantId: string): Promise<VehicleData[]> {
    return prisma.vehicle.findMany({
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
    return prisma.vehicle.findMany({
      where: { tenantId },
      include: { client: { select: { id: true, name: true } } },
      orderBy: { plate: "asc" },
    }) as unknown as VehicleData[];
  }

  async create(data: Omit<VehicleData, "id" | "client">): Promise<VehicleData> {
    return prisma.vehicle.create({
      data,
      include: { client: { select: { id: true, name: true } } },
    }) as unknown as VehicleData;
  }

  async update(id: string, data: Partial<Omit<VehicleData, "id" | "client">>): Promise<VehicleData> {
    return prisma.vehicle.update({
      where: { id },
      data,
      include: { client: { select: { id: true, name: true } } },
    }) as unknown as VehicleData;
  }

  async updateMileage(id: string, mileage: number): Promise<void> {
    await prisma.vehicle.update({
      where: { id },
      data: { mileage },
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.vehicle.delete({ where: { id } });
  }

  async countOrders(id: string): Promise<number> {
    return prisma.serviceOrder.count({ where: { vehicleId: id } });
  }
}
