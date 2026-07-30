import { IFinancialEntryRepository } from "@/domain/repositories/IFinancialEntryRepository";
import { PrismaClient } from "@prisma/client";

export interface DREInput {
  startDate: string; // ISO date
  endDate: string;   // ISO date
}

export interface DREResult {
  period: { start: string; end: string };
  // Receitas (vindas das OS entregues no período)
  revenue: {
    services: number;
    parts: number;
    total: number;
    orderCount: number;
  };
  // Despesas (do módulo financeiro — pagas no período)
  expenses: {
    fixed: number;
    variable: number;
    total: number;
    byCategory: Array<{ category: string; label: string; total: number }>;
  };
  // Resultado
  grossProfit: number;
  netProfit: number;
  margin: number; // percentual
  // Mensal (para gráfico)
  monthly: Array<{
    month: string;
    revenue: number;
    fixedExpenses: number;
    variableExpenses: number;
    profit: number;
  }>;
}

const CATEGORY_LABELS: Record<string, string> = {
  RENT: "Aluguel",
  ENERGY: "Energia",
  WATER: "Água",
  INTERNET: "Internet / Telefone",
  INSURANCE: "Seguro",
  ACCOUNTING: "Contabilidade",
  SALARY: "Salários",
  PARTS_SUPPLIER: "Fornecedores de Peças",
  TOOLS: "Ferramentas / Equipamentos",
  MAINTENANCE: "Manutenção",
  MARKETING: "Marketing",
  TAX: "Impostos / Taxas",
  SOFTWARE: "Sistemas / Licenças",
  FUEL: "Combustível",
  OTHER_FIXED: "Outros (fixos)",
  OTHER_VARIABLE: "Outros (variáveis)",
};

const FIXED_CATEGORIES = [
  "RENT", "ENERGY", "WATER", "INTERNET", "INSURANCE",
  "ACCOUNTING", "SALARY", "SOFTWARE", "TAX",
];

export class GenerateDRE {
  constructor(
    private readonly financialRepo: IFinancialEntryRepository,
    private readonly db: PrismaClient
  ) {}

  async execute(input: DREInput, tenantId: string): Promise<DREResult> {
    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);

    // 1. Receitas — OS entregues no período
    const orders = await this.db.serviceOrder.findMany({
      where: {
        tenantId,
        status: "DELIVERED",
        updatedAt: { gte: startDate, lte: endDate },
      },
      include: {
        services: true,
        parts: true,
      },
    });

    const revenueServices = orders.reduce(
      (sum, o) => sum + o.services.reduce((s, svc) => s + svc.price, 0),
      0
    );
    const revenueParts = orders.reduce(
      (sum, o) => sum + o.parts.reduce((s, p) => s + p.totalPrice, 0),
      0
    );
    const totalRevenue = revenueServices + revenueParts;

    // 2. Despesas — lançamentos pagos no período
    const summary = await this.financialRepo.getSummary(tenantId, startDate, endDate);

    let fixedTotal = 0;
    let variableTotal = 0;
    const byCategory = summary.byCategory.map((item) => {
      const isFixed = FIXED_CATEGORIES.includes(item.category);
      if (isFixed) fixedTotal += item.total;
      else variableTotal += item.total;
      return {
        category: item.category,
        label: CATEGORY_LABELS[item.category] || item.category,
        total: item.total,
      };
    });

    // 3. DRE mensal
    const monthly = await this.buildMonthly(tenantId, startDate, endDate);

    const grossProfit = totalRevenue - variableTotal;
    const netProfit = totalRevenue - fixedTotal - variableTotal;
    const margin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    return {
      period: { start: input.startDate, end: input.endDate },
      revenue: {
        services: revenueServices,
        parts: revenueParts,
        total: totalRevenue,
        orderCount: orders.length,
      },
      expenses: {
        fixed: fixedTotal,
        variable: variableTotal,
        total: fixedTotal + variableTotal,
        byCategory,
      },
      grossProfit,
      netProfit,
      margin: Math.round(margin * 100) / 100,
      monthly,
    };
  }

  private async buildMonthly(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<DREResult["monthly"]> {
    const months: DREResult["monthly"] = [];
    const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const end = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0);

    while (current <= end) {
      const monthStart = new Date(current);
      const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0, 23, 59, 59);

      // Revenue from OS
      const orders = await this.db.serviceOrder.findMany({
        where: {
          tenantId,
          status: "DELIVERED",
          updatedAt: { gte: monthStart, lte: monthEnd },
        },
        include: { services: true, parts: true },
      });
      const revenue = orders.reduce(
        (sum, o) =>
          sum +
          o.services.reduce((s, svc) => s + svc.price, 0) +
          o.parts.reduce((s, p) => s + p.totalPrice, 0),
        0
      );

      // Expenses
      const summary = await this.financialRepo.getSummary(tenantId, monthStart, monthEnd);
      let fixed = 0;
      let variable = 0;
      for (const item of summary.byCategory) {
        if (FIXED_CATEGORIES.includes(item.category)) fixed += item.total;
        else variable += item.total;
      }

      months.push({
        month: `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`,
        revenue,
        fixedExpenses: fixed,
        variableExpenses: variable,
        profit: revenue - fixed - variable,
      });

      current.setMonth(current.getMonth() + 1);
    }

    return months;
  }
}
