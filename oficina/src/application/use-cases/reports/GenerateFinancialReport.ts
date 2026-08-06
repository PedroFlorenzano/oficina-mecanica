import { PrismaClient, Prisma } from "@prisma/client";
import { ForbiddenError } from "@/domain/errors/DomainError";

interface DateRange {
  startDate?: string;
  endDate?: string;
}

interface OrderProfitEntry {
  id: string;
  number: number;
  client: string;
  plate: string;
  revenue: number;
  partsCost: number;
  profit: number;
  margin: number;
  date: Date;
}

interface FinancialReportResult {
  totalOrders: number;
  totalRevenue: number;
  avgTicket: number;
  partsCost: number;
  grossProfit: number;
  // Novos — custos do módulo financeiro
  fixedCosts: number;
  variableCosts: number;
  totalCosts: number; // peças + fixo + variável
  netProfit: number; // faturamento - totalCosts (lucro real)
  profitMargin: number; // % margem líquida
  // Rentabilidade acumulada mensal
  profitability: { month: string; revenue: number; costs: number; netProfit: number; accumulated: number }[];
  cancelledCount: number;
  completedCount: number;
  byStatus: Record<string, { count: number; total: number }>;
  monthly: { month: string; revenue: number; count: number }[];
  profitByOrder: OrderProfitEntry[];
}

export class GenerateFinancialReport {
  constructor(private readonly db: PrismaClient) {}

  async execute(tenantId: string, role: string, dateRange: DateRange): Promise<FinancialReportResult> {
    if (role !== "ADMIN") {
      throw new ForbiddenError("Acesso restrito a administradores");
    }

    const dateFilter: Prisma.DateTimeFilter = {};
    if (dateRange.startDate) dateFilter.gte = new Date(dateRange.startDate);
    if (dateRange.endDate) dateFilter.lte = new Date(dateRange.endDate + "T23:59:59.999Z");
    const hasDateFilter = dateRange.startDate || dateRange.endDate;

    const orderWhere: Prisma.ServiceOrderWhereInput = { tenantId };
    if (hasDateFilter) orderWhere.createdAt = dateFilter;

    const [orders, completedOrders, cancelledCount, stockMovements, paidExpenses] = await Promise.all([
      this.db.serviceOrder.findMany({
        where: orderWhere,
        select: { id: true, status: true, totalAmount: true, createdAt: true },
      }),
      this.db.serviceOrder.findMany({
        where: { ...orderWhere, status: { in: ["COMPLETED", "DELIVERED"] } },
        select: { totalAmount: true },
      }),
      this.db.serviceOrder.count({
        where: { ...orderWhere, status: "CANCELLED" },
      }),
      this.db.stockMovement.findMany({
        where: {
          stockItem: { tenantId },
          ...(hasDateFilter ? { createdAt: dateFilter } : {}),
        },
        select: { type: true, quantity: true, unitCost: true, stockItem: { select: { avgCost: true } } },
      }),
      // Despesas pagas no período (módulo financeiro)
      this.db.financialEntry.findMany({
        where: {
          tenantId,
          status: "PAID",
          ...(hasDateFilter ? { paidAt: dateFilter } : {}),
        },
        select: { category: true, paidAmount: true, amount: true, paidAt: true },
      }),
    ]);

    const totalOrders = orders.length;
    const totalRevenue = completedOrders.reduce((s, o) => s + o.totalAmount, 0);
    const avgTicket = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;

    const partsCost = stockMovements
      .filter((m) => m.type === "CONSUMPTION")
      .reduce((s, m) => s + m.quantity * (m.unitCost ?? m.stockItem.avgCost), 0);

    // Custos fixos e variáveis (módulo financeiro)
    const FIXED_CATEGORIES = ["RENT", "ENERGY", "WATER", "INTERNET", "INSURANCE", "ACCOUNTING", "SALARY", "SOFTWARE", "TAX"];
    let fixedCosts = 0;
    let variableCosts = 0;
    for (const exp of paidExpenses) {
      const amount = exp.paidAmount ?? exp.amount;
      if (FIXED_CATEGORIES.includes(exp.category)) {
        fixedCosts += amount;
      } else {
        variableCosts += amount;
      }
    }

    const totalCosts = partsCost + fixedCosts + variableCosts;
    const netProfit = totalRevenue - totalCosts;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // Rentabilidade acumulada mensal
    const profitability = await this.calculateProfitability(tenantId, orders);

    const byStatus = this.aggregateByStatus(orders);
    const monthly = this.aggregateMonthly(orders);
    const profitByOrder = await this.calculateProfitByOrder(orderWhere);

    return {
      totalOrders,
      totalRevenue,
      avgTicket,
      partsCost,
      grossProfit: totalRevenue - partsCost,
      fixedCosts,
      variableCosts,
      totalCosts,
      netProfit,
      profitMargin: Math.round(profitMargin * 100) / 100,
      profitability,
      cancelledCount,
      completedCount: completedOrders.length,
      byStatus,
      monthly,
      profitByOrder,
    };
  }

  private async calculateProfitability(
    tenantId: string,
    orders: { status: string; totalAmount: number; createdAt: Date }[]
  ): Promise<{ month: string; revenue: number; costs: number; netProfit: number; accumulated: number }[]> {
    const FIXED_CATEGORIES = ["RENT", "ENERGY", "WATER", "INTERNET", "INSURANCE", "ACCOUNTING", "SALARY", "SOFTWARE", "TAX"];
    const result: { month: string; revenue: number; costs: number; netProfit: number; accumulated: number }[] = [];
    let accumulated = 0;

    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

      // Receita do mês
      const monthRevenue = orders
        .filter((o) => {
          const c = new Date(o.createdAt);
          return c >= monthStart && c <= monthEnd && (o.status === "COMPLETED" || o.status === "DELIVERED");
        })
        .reduce((s, o) => s + o.totalAmount, 0);

      // Despesas do mês (financeiro + peças)
      const monthExpenses = await this.db.financialEntry.findMany({
        where: { tenantId, status: "PAID", paidAt: { gte: monthStart, lte: monthEnd } },
        select: { category: true, paidAmount: true, amount: true },
      });

      const monthPartsMovements = await this.db.stockMovement.findMany({
        where: {
          stockItem: { tenantId },
          type: "CONSUMPTION",
          createdAt: { gte: monthStart, lte: monthEnd },
        },
        select: { quantity: true, unitCost: true, stockItem: { select: { avgCost: true } } },
      });

      let monthCosts = monthPartsMovements.reduce(
        (s, m) => s + m.quantity * (m.unitCost ?? m.stockItem.avgCost), 0
      );
      for (const exp of monthExpenses) {
        monthCosts += exp.paidAmount ?? exp.amount;
      }

      const monthProfit = monthRevenue - monthCosts;
      accumulated += monthProfit;

      result.push({
        month: monthStart.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
        revenue: monthRevenue,
        costs: monthCosts,
        netProfit: monthProfit,
        accumulated,
      });
    }

    return result;
  }

  private aggregateByStatus(orders: { status: string; totalAmount: number }[]): Record<string, { count: number; total: number }> {
    const byStatus: Record<string, { count: number; total: number }> = {};
    for (const o of orders) {
      if (!byStatus[o.status]) byStatus[o.status] = { count: 0, total: 0 };
      byStatus[o.status].count++;
      byStatus[o.status].total += o.totalAmount;
    }
    return byStatus;
  }

  private aggregateMonthly(orders: { status: string; totalAmount: number; createdAt: Date }[]): { month: string; revenue: number; count: number }[] {
    const monthly: { month: string; revenue: number; count: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const monthOrders = orders.filter((o) => {
        const c = new Date(o.createdAt);
        return c >= d && c <= end && (o.status === "COMPLETED" || o.status === "DELIVERED");
      });
      monthly.push({
        month: d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
        revenue: monthOrders.reduce((s, o) => s + o.totalAmount, 0),
        count: monthOrders.length,
      });
    }
    return monthly;
  }

  private async calculateProfitByOrder(orderWhere: Prisma.ServiceOrderWhereInput): Promise<OrderProfitEntry[]> {
    const ordersWithCost = await this.db.serviceOrder.findMany({
      where: { ...orderWhere, status: { in: ["COMPLETED", "DELIVERED"] } },
      select: {
        id: true,
        number: true,
        totalAmount: true,
        createdAt: true,
        client: { select: { name: true } },
        vehicle: { select: { plate: true } },
        movements: {
          where: { type: "CONSUMPTION" },
          select: { quantity: true, unitCost: true, stockItem: { select: { avgCost: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return ordersWithCost.map((o) => {
      const cost = o.movements.reduce((s, m) => s + m.quantity * (m.unitCost ?? m.stockItem.avgCost), 0);
      return {
        id: o.id,
        number: o.number,
        client: o.client.name,
        plate: o.vehicle.plate,
        revenue: o.totalAmount,
        partsCost: cost,
        profit: o.totalAmount - cost,
        margin: o.totalAmount > 0 ? ((o.totalAmount - cost) / o.totalAmount) * 100 : 0,
        date: o.createdAt,
      };
    });
  }
}
