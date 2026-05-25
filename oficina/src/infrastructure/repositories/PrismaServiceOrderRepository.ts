import { prisma } from "../database/prisma";
import { IServiceOrderRepository, OrderData, OrderSummary, CreateOrderData, LegacyCreateOrderData } from "@/domain/repositories/IServiceOrderRepository";

export class PrismaServiceOrderRepository implements IServiceOrderRepository {
  async findById(id: string): Promise<any> {
    return prisma.serviceOrder.findUnique({
      where: { id },
      include: {
        client: true,
        vehicle: true,
        createdBy: { select: { name: true } },
        complaints: {
          orderBy: { number: "asc" },
          include: {
            services: true,
            parts: { include: { stockItem: true } },
          },
        },
        services: { include: { service: true } },
        parts: { include: { stockItem: true } },
        statusHistory: { orderBy: { createdAt: "desc" } },
      },
    });
  }

  async findAll(tenantId: string): Promise<OrderData[]> {
    return prisma.serviceOrder.findMany({
      where: { tenantId },
      include: {
        client: { select: { name: true } },
        vehicle: { select: { plate: true, model: true } },
      },
      orderBy: { createdAt: "desc" },
    }) as unknown as OrderData[];
  }

  async findActive(tenantId: string): Promise<any[]> {
    return prisma.serviceOrder.findMany({
      where: {
        tenantId,
        status: { notIn: ["DELIVERED", "CANCELLED"] },
      },
      include: {
        client: { select: { name: true } },
        vehicle: { select: { plate: true, brand: true, model: true } },
        complaints: { select: { description: true } },
        createdBy: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getNextNumber(tenantId: string): Promise<number> {
    const lastOrder = await prisma.serviceOrder.findFirst({
      where: { tenantId },
      orderBy: { number: "desc" },
      select: { number: true },
    });
    return (lastOrder?.number || 0) + 1;
  }

  async createWithComplaints(data: CreateOrderData): Promise<any> {
    const nextNumber = await this.getNextNumber(data.tenantId);

    const order = await prisma.serviceOrder.create({
      data: {
        number: nextNumber,
        status: "WAITING_APPROVAL",
        mileage: data.mileage,
        notes: data.notes,
        totalAmount: data.totalAmount,
        clientId: data.clientId,
        vehicleId: data.vehicleId,
        tenantId: data.tenantId,
        createdById: data.createdById,
        statusHistory: {
          create: { toStatus: "WAITING_APPROVAL", userId: data.createdById },
        },
      },
    });

    for (let i = 0; i < data.complaints.length; i++) {
      const c = data.complaints[i];
      const complaint = await prisma.complaint.create({
        data: {
          number: i + 1,
          description: c.description,
          orderId: order.id,
        },
      });

      if (c.services && c.services.length > 0) {
        for (const s of c.services) {
          await prisma.orderService.create({
            data: {
              description: s.description,
              price: s.price,
              timeMinutes: s.timeMinutes || null,
              serviceId: s.serviceId || null,
              mechanicId: s.mechanicId || null,
              orderId: order.id,
              complaintId: complaint.id,
            },
          });
        }
      }

      if (c.parts && c.parts.length > 0) {
        for (const p of c.parts) {
          let stockItemId = p.stockItemId || null;
          if (!stockItemId) {
            const match = await prisma.stockItem.findFirst({
              where: { description: p.description, tenantId: data.tenantId },
              select: { id: true },
            });
            if (match) stockItemId = match.id;
          }
          await prisma.orderPart.create({
            data: {
              description: p.description,
              quantity: p.quantity,
              unitPrice: p.unitPrice,
              totalPrice: p.quantity * p.unitPrice,
              stockItemId,
              orderId: order.id,
              complaintId: complaint.id,
            },
          });
        }
      }
    }

    return prisma.serviceOrder.findUnique({
      where: { id: order.id },
      include: {
        client: { select: { name: true } },
        vehicle: { select: { plate: true, model: true } },
      },
    });
  }

  async createLegacy(data: LegacyCreateOrderData): Promise<any> {
    const nextNumber = await this.getNextNumber(data.tenantId);

    const servicesTotal = data.services.reduce((sum, s) => sum + (s.price || 0), 0);
    const partsTotal = (data.parts || []).reduce((sum, p) => sum + (p.quantity || 0) * (p.unitPrice || 0), 0);

    return prisma.serviceOrder.create({
      data: {
        number: nextNumber,
        status: "WAITING_APPROVAL",
        mileage: data.mileage,
        notes: data.notes,
        totalAmount: servicesTotal + partsTotal,
        clientId: data.clientId,
        vehicleId: data.vehicleId,
        tenantId: data.tenantId,
        createdById: data.createdById,
        services: {
          create: data.services.map((s) => ({
            description: s.description,
            price: s.price,
            serviceId: s.serviceId || null,
            mechanicId: s.mechanicId || null,
          })),
        },
        parts: data.parts?.length
          ? {
              create: data.parts.map((p) => ({
                description: p.description,
                quantity: p.quantity,
                unitPrice: p.unitPrice,
                totalPrice: p.quantity * p.unitPrice,
                stockItemId: p.stockItemId || null,
              })),
            }
          : undefined,
        statusHistory: {
          create: { toStatus: "WAITING_APPROVAL", userId: data.createdById },
        },
      },
      include: {
        client: { select: { name: true } },
        vehicle: { select: { plate: true, model: true } },
      },
    });
  }

  async updateStatus(id: string, status: string, userId: string): Promise<any> {
    const order = await prisma.serviceOrder.findUnique({ where: { id } });
    if (!order) return null;

    return prisma.serviceOrder.update({
      where: { id },
      data: {
        status: status as any,
        statusHistory: {
          create: {
            fromStatus: order.status,
            toStatus: status as any,
            userId,
          },
        },
      },
    });
  }

  async findByClientId(clientId: string, tenantId: string): Promise<OrderSummary[]> {
    return prisma.serviceOrder.findMany({
      where: { clientId, tenantId },
      select: {
        id: true,
        number: true,
        status: true,
        totalAmount: true,
        createdAt: true,
        vehicle: { select: { plate: true } },
      },
      orderBy: { createdAt: "desc" },
    }) as unknown as OrderSummary[];
  }

  async findByVehicleId(vehicleId: string, tenantId: string): Promise<OrderSummary[]> {
    return prisma.serviceOrder.findMany({
      where: { vehicleId, tenantId },
      select: {
        id: true,
        number: true,
        status: true,
        totalAmount: true,
        createdAt: true,
        client: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }) as unknown as OrderSummary[];
  }

  async findOilChangeOrders(vehicleId: string, tenantId: string): Promise<{ mileage: number; createdAt: Date }[]> {
    const orders = await prisma.serviceOrder.findMany({
      where: {
        vehicleId,
        tenantId,
        complaints: {
          some: {
            description: { contains: "troca de óleo" },
          },
        },
      },
      select: {
        mileage: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return orders;
  }

  async cancel(id: string, reason: string, userId: string): Promise<any> {
    const order = await prisma.serviceOrder.findUnique({ where: { id } });
    if (!order) return null;

    return prisma.serviceOrder.update({
      where: { id },
      data: {
        status: "CANCELLED",
        cancelReason: reason,
        statusHistory: {
          create: {
            fromStatus: order.status,
            toStatus: "CANCELLED",
            userId,
          },
        },
      },
    });
  }
}
