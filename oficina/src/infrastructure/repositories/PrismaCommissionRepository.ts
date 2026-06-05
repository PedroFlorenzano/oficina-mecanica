import { PrismaClient, Prisma, CommissionStatus } from "@prisma/client";
import {
  ICommissionRepository,
  CommissionData,
  CommissionFilters,
  EligibleService,
  CommissionSummary,
  CreateCommissionData,
  UpdateCommissionStatusData,
} from "@/domain/repositories/ICommissionRepository";

export class PrismaCommissionRepository implements ICommissionRepository {
  // Defense in depth: RLS também filtra no banco
  constructor(private readonly db: PrismaClient) {}

  async create(data: CreateCommissionData): Promise<CommissionData> {
    return this.db.commission.create({
      data: {
        mechanicId: data.mechanicId,
        tenantId: data.tenantId,
        startDate: data.startDate,
        endDate: data.endDate,
        commissionRate: data.commissionRate,
        totalBase: data.totalBase,
        totalCommission: data.totalCommission,
        items: {
          create: data.items.map((item) => ({
            orderServiceId: item.orderServiceId,
            baseValue: item.baseValue,
            commissionValue: item.commissionValue,
          })),
        },
      },
      include: { items: true, mechanic: { select: { name: true } } },
    });
  }

  async findById(id: string, tenantId: string): Promise<CommissionData | null> {
    return this.db.commission.findFirst({
      where: { id, tenantId },
      include: { mechanic: { select: { name: true } } },
    });
  }

  async findByIdWithItems(id: string, tenantId: string): Promise<CommissionData | null> {
    return this.db.commission.findFirst({
      where: { id, tenantId },
      include: {
        mechanic: { select: { name: true } },
        items: {
          include: {
            orderService: {
              include: {
                order: {
                  select: {
                    id: true,
                    number: true,
                    client: { select: { name: true } },
                    vehicle: { select: { model: true, plate: true } },
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async findAll(tenantId: string, filters: CommissionFilters): Promise<CommissionData[]> {
    const where: Prisma.CommissionWhereInput = { tenantId };
    if (filters.mechanicId) where.mechanicId = filters.mechanicId;
    if (filters.status) where.status = filters.status as CommissionStatus;
    if (filters.startDate || filters.endDate) {
      if (filters.startDate) where.startDate = { gte: new Date(filters.startDate) };
      if (filters.endDate) where.endDate = { lte: new Date(filters.endDate) };
    }

    return this.db.commission.findMany({
      where,
      include: { mechanic: { select: { name: true } }, _count: { select: { items: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async findByMechanic(mechanicId: string, tenantId: string, filters: CommissionFilters): Promise<CommissionData[]> {
    const where: Prisma.CommissionWhereInput = { tenantId, mechanicId };
    if (filters.status) where.status = filters.status as CommissionStatus;

    return this.db.commission.findMany({
      where,
      include: { mechanic: { select: { name: true } }, _count: { select: { items: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOverlapping(mechanicId: string, tenantId: string, startDate: Date, endDate: Date): Promise<CommissionData | null> {
    return this.db.commission.findFirst({
      where: {
        mechanicId,
        tenantId,
        status: { in: ["PENDING", "APPROVED"] },
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    });
  }

  async updateStatus(id: string, data: UpdateCommissionStatusData): Promise<CommissionData> {
    return this.db.commission.update({
      where: { id },
      data,
      include: { mechanic: { select: { name: true } } },
    });
  }

  async getEligibleServices(mechanicId: string, tenantId: string, startDate: Date, endDate: Date): Promise<EligibleService[]> {
    const services = await this.db.orderService.findMany({
      where: {
        mechanicId,
        order: {
          tenantId,
          status: { in: ["COMPLETED", "DELIVERED"] },
          updatedAt: { gte: startDate, lte: endDate },
        },
        commissionItems: {
          none: {
            commission: { status: { in: ["PENDING", "APPROVED", "PAID"] } },
          },
        },
      },
      include: {
        order: {
          select: {
            id: true,
            number: true,
            client: { select: { name: true } },
            vehicle: { select: { plate: true } },
          },
        },
      },
    });

    return services.map((s) => ({
      id: s.id,
      description: s.description,
      price: s.price,
      commissionRate: s.commissionRate,
      orderId: s.order.id,
      orderNumber: s.order.number,
      clientName: s.order.client.name,
      vehiclePlate: s.order.vehicle.plate,
    }));
  }

  async getMechanicSummary(mechanicId: string, tenantId: string): Promise<CommissionSummary> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [pending, approved, paidMonth, paidAll] = await Promise.all([
      this.db.commission.aggregate({ where: { mechanicId, tenantId, status: "PENDING" }, _sum: { totalCommission: true } }),
      this.db.commission.aggregate({ where: { mechanicId, tenantId, status: "APPROVED" }, _sum: { totalCommission: true } }),
      this.db.commission.aggregate({ where: { mechanicId, tenantId, status: "PAID", paidAt: { gte: monthStart } }, _sum: { totalCommission: true } }),
      this.db.commission.aggregate({ where: { mechanicId, tenantId, status: "PAID" }, _sum: { totalCommission: true } }),
    ]);

    return {
      totalPending: pending._sum.totalCommission || 0,
      totalApproved: approved._sum.totalCommission || 0,
      totalPaidMonth: paidMonth._sum.totalCommission || 0,
      totalPaidAll: paidAll._sum.totalCommission || 0,
    };
  }
}
