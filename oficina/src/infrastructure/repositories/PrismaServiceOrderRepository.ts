import { PrismaClient, OrderStatus } from "@prisma/client";
import { IServiceOrderRepository, OrderData, OrderDetail as IOrderDetail, ActiveOrder as IActiveOrder, OrderSummary, CreateOrderData, LegacyCreateOrderData, StatusHistoryEntry } from "@/domain/repositories/IServiceOrderRepository";
import { NotFoundError } from "@/domain/errors/DomainError";

export class PrismaServiceOrderRepository implements IServiceOrderRepository {
  // Defense in depth: RLS também filtra no banco
  constructor(private readonly db: PrismaClient) {}

  async findById(id: string): Promise<IOrderDetail | null> {
    return this.db.serviceOrder.findUnique({
      where: { id },
      include: {
        client: true,
        vehicle: true,
        createdBy: { select: { name: true } },
        attendant: { select: { id: true, name: true } },
        complaints: {
          orderBy: { number: "asc" },
          include: {
            services: { include: { service: true } },
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
    return this.db.serviceOrder.findMany({
      where: { tenantId },
      include: {
        client: { select: { name: true } },
        vehicle: { select: { plate: true, model: true } },
      },
      orderBy: { createdAt: "desc" },
    }) as unknown as OrderData[];
  }

  async findActive(tenantId: string): Promise<IActiveOrder[]> {
    return this.db.serviceOrder.findMany({
      where: {
        tenantId,
        status: { notIn: ["DELIVERED", "CANCELLED"] },
      },
      include: {
        client: { select: { name: true } },
        vehicle: { select: { plate: true, brand: true, model: true } },
        complaints: { select: { description: true } },
        createdBy: { select: { name: true } },
        services: { select: { mechanicId: true } },
      },
      orderBy: { createdAt: "desc" },
    }) as unknown as IActiveOrder[];
  }

  async getNextNumber(tenantId: string): Promise<number> {
    const lastOrder = await this.db.serviceOrder.findFirst({
      where: { tenantId },
      orderBy: { number: "desc" },
      select: { number: true },
    });
    return (lastOrder?.number || 0) + 1;
  }

  async createWithComplaints(data: CreateOrderData): Promise<OrderData | null> {
    return this.db.$transaction(async (tx) => {
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
          mileageOut: data.mileageOut ?? null,
          notes: data.notes,
          totalAmount: data.totalAmount,
          clientId: data.clientId,
          vehicleId: data.vehicleId,
          tenantId: data.tenantId,
          createdById: data.createdById,
          attendantId: data.attendantId ?? null,
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
              commissionRate: s.commissionRate ?? null,
              approved: s.approved ?? true,
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
                costPrice: p.costPrice ?? null,
                totalPrice: p.quantity * p.unitPrice,
                stockItemId,
                approved: p.approved ?? true,
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
    }, { timeout: 15000 });
  }

  async createLegacy(data: LegacyCreateOrderData): Promise<OrderData> {
    const nextNumber = await this.getNextNumber(data.tenantId);

    const servicesTotal = data.services.reduce((sum, s) => sum + (s.price || 0), 0);
    const partsTotal = (data.parts || []).reduce((sum, p) => sum + (p.quantity || 0) * (p.unitPrice || 0), 0);

    return this.db.serviceOrder.create({
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
    const order = await this.db.serviceOrder.findUnique({ where: { id } });
    if (!order) return null;

    return this.db.serviceOrder.update({
      where: { id },
      data: {
        status: status as OrderStatus,
        statusHistory: {
          create: {
            fromStatus: order.status,
            toStatus: status as OrderStatus,
            userId,
          },
        },
      },
    });
  }

  async recordStatusHistory(orderId: string, status: string, userId: string): Promise<void> {
    const order = await this.db.serviceOrder.findUnique({ where: { id: orderId }, select: { status: true } });
    if (!order) return;
    // Registra a edição sem trocar o status: fromStatus == toStatus == status atual
    await this.db.statusHistory.create({
      data: {
        fromStatus: status as OrderStatus,
        toStatus: status as OrderStatus,
        userId,
        orderId,
      },
    });
  }

  async getStatusHistory(orderId: string): Promise<StatusHistoryEntry[]> {
    const entries = await this.db.statusHistory.findMany({
      where: { orderId },
      orderBy: { createdAt: "asc" },
      select: { fromStatus: true, toStatus: true, createdAt: true },
    });
    return entries as StatusHistoryEntry[];
  }

  async findByClientId(clientId: string, tenantId: string): Promise<OrderSummary[]> {
    return this.db.serviceOrder.findMany({
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
    return this.db.serviceOrder.findMany({
      where: { vehicleId, tenantId },
      select: {
        id: true,
        number: true,
        status: true,
        totalAmount: true,
        createdAt: true,
        client: { select: { name: true } },
        services: { select: { description: true } },
      },
      orderBy: { createdAt: "desc" },
    }) as unknown as OrderSummary[];
  }

  async findOilChangeOrders(vehicleId: string, tenantId: string): Promise<{ mileage: number; createdAt: Date }[]> {
    const orders = await this.db.serviceOrder.findMany({
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
    const order = await this.db.serviceOrder.findUnique({ where: { id } });
    if (!order) return null;

    return this.db.serviceOrder.update({
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
    complaints: { description: string; services: { description: string; price: number; timeMinutes?: number | null; serviceId?: string | null; mechanicId?: string | null; commissionRate?: number | null; approved?: boolean }[]; parts: { description: string; quantity: number; unitPrice: number; costPrice?: number | null; stockItemId?: string | null; approved?: boolean }[] }[],
    totalAmount: number,
    notes: string | null,
    extra?: { attendantId?: string | null; mileageOut?: number | null }
  ): Promise<OrderData> {
    return this.db.$transaction(async (tx) => {
      await tx.orderPart.deleteMany({ where: { orderId } });
      await tx.orderService.deleteMany({ where: { orderId } });
      await tx.complaint.deleteMany({ where: { orderId } });

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
              commissionRate: s.commissionRate ?? null,
              approved: s.approved ?? true,
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
              costPrice: p.costPrice ?? null,
              totalPrice: p.quantity * p.unitPrice,
              stockItemId,
              approved: p.approved ?? true,
              orderId,
              complaintId: complaint.id,
            },
          });
        }
      }

      await tx.serviceOrder.update({
        where: { id: orderId },
        data: {
          totalAmount,
          notes,
          ...(extra?.attendantId !== undefined ? { attendantId: extra.attendantId } : {}),
          ...(extra?.mileageOut !== undefined ? { mileageOut: extra.mileageOut } : {}),
        },
      });

      return tx.serviceOrder.findUnique({
        where: { id: orderId },
        include: {
          client: { select: { name: true } },
          vehicle: { select: { plate: true, model: true } },
          complaints: { include: { services: true, parts: true } },
        },
      }) as unknown as OrderData;
    });
  }

  async setItemApproval(orderId: string, itemType: "service" | "part", itemId: string, approved: boolean): Promise<OrderData> {
    return this.db.$transaction(async (tx) => {
      if (itemType === "service") {
        const result = await tx.orderService.updateMany({ where: { id: itemId, orderId }, data: { approved } });
        if (result.count === 0) {
          // DomainError, não Error puro: erro puro virava 500 "Erro interno do servidor"
          throw new NotFoundError("Serviço da OS", itemId);
        }
      } else {
        const result = await tx.orderPart.updateMany({ where: { id: itemId, orderId }, data: { approved } });
        if (result.count === 0) {
          throw new NotFoundError("Item de peça da OS", itemId);
        }
      }

      const [services, parts] = await Promise.all([
        tx.orderService.findMany({ where: { orderId }, select: { price: true, approved: true } }),
        tx.orderPart.findMany({ where: { orderId }, select: { totalPrice: true, approved: true } }),
      ]);

      const totalAmount =
        services.reduce((sum, s) => sum + (s.approved ? s.price : 0), 0) +
        parts.reduce((sum, p) => sum + (p.approved ? p.totalPrice : 0), 0);

      await tx.serviceOrder.update({ where: { id: orderId }, data: { totalAmount } });

      return tx.serviceOrder.findUnique({
        where: { id: orderId },
        include: {
          client: { select: { name: true } },
          vehicle: { select: { plate: true, model: true } },
        },
      }) as unknown as Promise<OrderData>;
    });
  }
}
