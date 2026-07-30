import { PrismaClient, ExpenseCategory } from "@prisma/client";
import {
  IFinancialEntryRepository,
  FinancialEntryData,
  CreateFinancialEntryInput,
  UpdateFinancialEntryInput,
  FinancialEntryFilters,
} from "@/domain/repositories/IFinancialEntryRepository";

export class PrismaFinancialEntryRepository implements IFinancialEntryRepository {
  constructor(private readonly db: PrismaClient) {}

  async create(data: CreateFinancialEntryInput): Promise<FinancialEntryData> {
    const entry = await this.db.financialEntry.create({
      data: {
        description: data.description,
        type: data.type,
        category: data.category as ExpenseCategory,
        amount: data.amount,
        dueDate: data.dueDate,
        installment: data.installment || 1,
        totalInstallments: data.totalInstallments || 1,
        supplier: data.supplier,
        notes: data.notes,
        tenantId: data.tenantId,
        createdBy: data.createdBy,
      },
    });
    return entry as FinancialEntryData;
  }

  async findById(id: string, tenantId: string): Promise<FinancialEntryData | null> {
    const entry = await this.db.financialEntry.findFirst({
      where: { id, tenantId },
    });
    return entry as FinancialEntryData | null;
  }

  async findAll(tenantId: string, filters?: FinancialEntryFilters): Promise<FinancialEntryData[]> {
    const now = new Date();

    // Primeiro, atualiza lançamentos vencidos (PENDING + dueDate < hoje)
    await this.db.financialEntry.updateMany({
      where: {
        tenantId,
        status: "PENDING",
        dueDate: { lt: now },
      },
      data: { status: "OVERDUE" },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { tenantId };

    if (filters?.status && filters.status !== "ALL") {
      where.status = filters.status;
    }
    if (filters?.category) {
      where.category = filters.category;
    }
    if (filters?.supplier) {
      where.supplier = { contains: filters.supplier, mode: "insensitive" };
    }
    if (filters?.startDate || filters?.endDate) {
      where.dueDate = {};
      if (filters.startDate) where.dueDate.gte = filters.startDate;
      if (filters.endDate) where.dueDate.lte = filters.endDate;
    }

    const entries = await this.db.financialEntry.findMany({
      where,
      orderBy: [{ status: "asc" }, { dueDate: "asc" }],
    });

    return entries as FinancialEntryData[];
  }

  async update(id: string, data: UpdateFinancialEntryInput): Promise<FinancialEntryData> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};
    if (data.description !== undefined) updateData.description = data.description;
    if (data.category !== undefined) updateData.category = data.category as ExpenseCategory;
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate;
    if (data.supplier !== undefined) updateData.supplier = data.supplier;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const entry = await this.db.financialEntry.update({
      where: { id },
      data: updateData,
    });
    return entry as FinancialEntryData;
  }

  async markAsPaid(id: string, paidAt: Date, paidAmount?: number): Promise<FinancialEntryData> {
    const entry = await this.db.financialEntry.update({
      where: { id },
      data: {
        status: "PAID",
        paidAt,
        paidAmount: paidAmount || undefined,
      },
    });
    return entry as FinancialEntryData;
  }

  async prorrogate(id: string, newDueDate: Date): Promise<FinancialEntryData> {
    const entry = await this.db.financialEntry.update({
      where: { id },
      data: {
        dueDate: newDueDate,
        status: "PENDING", // Se estava OVERDUE, volta para PENDING
      },
    });
    return entry as FinancialEntryData;
  }

  async delete(id: string): Promise<void> {
    await this.db.financialEntry.delete({ where: { id } });
  }

  async getSummary(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalPayable: number;
    totalReceivable: number;
    totalPaid: number;
    totalOverdue: number;
    byCategory: Array<{ category: string; total: number }>;
  }> {
    // Despesas pagas no período
    const paidEntries = await this.db.financialEntry.findMany({
      where: {
        tenantId,
        status: "PAID",
        paidAt: { gte: startDate, lte: endDate },
      },
    });

    let totalPayable = 0;
    let totalReceivable = 0;
    const categoryMap = new Map<string, number>();

    for (const entry of paidEntries) {
      const amount = entry.paidAmount || entry.amount;
      if (entry.type === "PAYABLE") {
        totalPayable += amount;
      } else {
        totalReceivable += amount;
      }
      const current = categoryMap.get(entry.category) || 0;
      categoryMap.set(entry.category, current + amount);
    }

    // Valores vencidos
    const overdueAgg = await this.db.financialEntry.aggregate({
      where: { tenantId, status: "OVERDUE" },
      _sum: { amount: true },
    });

    const byCategory = Array.from(categoryMap.entries())
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total);

    return {
      totalPayable,
      totalReceivable,
      totalPaid: totalPayable + totalReceivable,
      totalOverdue: overdueAgg._sum.amount || 0,
      byCategory,
    };
  }
}
