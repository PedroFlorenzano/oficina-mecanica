import { prisma } from "../database/prisma";
import { IServiceOrderRepository, OrderData, OrderSummary, CreateOrderData, LegacyCreateOrderData } from "@/domain/repositories/IServiceOrderRepository";
import { Prisma } from "@prisma/client";

type OrderDetail = Prisma.ServiceOrderGetPayload<{
  include: {
    client: true;
    vehicle: true;
    createdBy: { select: { name: true } };
    complaints: { include: { services: true; parts: { include: { stockItem: true } } } };
    services: { include: { service: true } };
    parts: { include: { stockItem: true } };
    statusHistory: true;
  };
}>;

type OrderWithClient = Prisma.ServiceOrderGetPayload<{
  include: { client: { select: { name: true } }; vehicle: { select: { plate: true; model: true } } };
}>;

type ActiveOrder = Prisma.ServiceOrderGetPayload<{
  include: {
    client: { select: { name: true } };
    vehicle: { select: { plate: true; brand: true; model: true } };
    complaints: { select: { description: true } };
    createdBy: { select: { name: true } };
  };
}>;

export class PrismaServiceOrderRepository implements IServiceOrderRepository {
  async findById(id: string): Promise<OrderDetail | null> {
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

  async findActive(tenantId: string): Promise<ActiveOrder[]> {
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

  async createWithComplaints(data: CreateOrderData): Promise<OrderWithClient | null> {
    return prisma.$transaction(async (tx) => {
      // getNextNumber dentro da transação para evitar race condition
      const lastOrder = await tx.serviceOrder.findFirst({
        where: { tenantId: data.tenantId },
        orderBy: { number: "desc" },
        select: { number: true },
      });
      const nextNumber = (lastOrder?.number || 0) + 1;

      const order = await tx.serviceOrder.create({
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
        const complaint = await tx.complaint.create({
          data: {
            number: i + 1,
            description: c.description,
            orderId: order.id,
          },
        });

        if (c.services && c.services.length > 0) {
          await tx.orderService.createMany({
            data: c.services.map((s) => ({
              description: s.description,
              price: s.price,
              timeMinutes: s.timeMinutes || null,
              serviceId: s.serviceId || null,
              mechanicId: s.mechanicId || null,
              orderId: order.id,
              complaintId: complaint.id,
            })),
          });
        }

        if (c.parts && c.parts.length > 0) {
          for (const p of c.parts) {
            let stockItemId = p.stockItemId || null;
            if (!stockItemId) {
              const match = await tx.stockItem.findFirst({
                where: { description: p.description, tenantId: data.tenantId },
                select: { id: true },
              });
              if (match) stockItemId = match.id;
            }
            await tx.orderPart.create({
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

      return tx.serviceOrder.findUnique({
        where: { id: order.id },
        include: {
          client: { select: { name: true } },
          vehicle: { select: { plate: true, model: true } },
        },
      });
    });
  }

  async createLegacy(data: LegacyCreateOrderData): Promise<OrderWithClient> {
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

  async updateStatus(id: string, status: string, userId: string): Promise<OrderData | null> {
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

  async cancel(id: string, reason: string, userId: string): Promise<OrderData | null> {
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

  async replaceComplaints(
    orderId: string,
    tenantId: string,
    complaints: { description: string; services: { description: string; price: number; timeMinutes?: number | null; serviceId?: string | null; mechanicId?: string | null }[]; parts: { description: string; quantity: number; unitPrice: number; stockItemId?: string | null }[] }[],
    totalAmount: number,
    notes: string | null
  ): Promise<any> {
    return prisma.$transaction(async (tx) => {
      // Deletar dados antigos (cascade não funciona em soft relations)
      await tx.orderPart.deleteMany({ where: { orderId } });
      await tx.orderService.deleteMany({ where: { orderId } });
      await tx.complaint.deleteMany({ where: { orderId } });

      // Recriar complaints com serviços e peças
      for (let i = 0; i < complaints.length; i++) {
        const c = complaints[i];
        const complaint = await tx.complaint.create({
          data: { number: i + 1, description: c.description, orderId },
        });

        if (c.services.length > 0) {
          await tx.orderService.createMany({
            data: c.services.map((s) => ({
              description: s.description,
              price: s.price,
              timeMinutes: s.timeMinutes || null,
              serviceId: s.serviceId || null,
              mechanicId: s.mechanicId || null,
              orderId,
              complaintId: complaint.id,
            })),
          });
        }

        for (const p of c.parts) {
          let stockItemId = p.stockItemId || null;
          if (!stockItemId) {
            const match = await tx.stockItem.findFirst({
              where: { description: p.description, tenantId },
              select: { id: true },
            });
            if (match) stockItemId = match.id;
          }
          await tx.orderPart.create({
            data: {
              description: p.description,
              quantity: p.quantity,
              unitPrice: p.unitPrice,
              totalPrice: p.quantity * p.unitPrice,
              stockItemId,
              orderId,
              complaintId: complaint.id,
            },
          });
        }
      }

      // Atualizar totalAmount e notes
      await tx.serviceOrder.update({
        where: { id: orderId },
        data: { totalAmount, notes },
      });

      return tx.serviceOrder.findUnique({
        where: { id: orderId },
        include: {
          client: { select: { name: true } },
          vehicle: { select: { plate: true, model: true } },
          complaints: { include: { services: true, parts: true } },
        },
      });
    });
  }
}
