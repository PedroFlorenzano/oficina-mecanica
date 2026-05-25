import { prisma } from "@/infrastructure/database/prisma";
import { Prisma, FiscalInvoiceStatus, FiscalInvoiceType } from "@prisma/client";
import { IFiscalRepository, FiscalConfigData, FiscalInvoiceData, CreateInvoiceData } from "@/domain/repositories/IFiscalRepository";

export class PrismaFiscalRepository implements IFiscalRepository {
  async getConfig(tenantId: string): Promise<FiscalConfigData | null> {
    return prisma.fiscalConfig.findUnique({ where: { tenantId } }) as unknown as Promise<FiscalConfigData | null>;
  }

  async upsertConfig(tenantId: string, data: Partial<FiscalConfigData>): Promise<FiscalConfigData> {
    const { tenantId: _, id: __, ...rest } = data;
    return prisma.fiscalConfig.upsert({
      where: { tenantId },
      update: rest,
      create: { tenantId, ...rest },
    }) as unknown as Promise<FiscalConfigData>;
  }

  async createInvoice(data: CreateInvoiceData): Promise<FiscalInvoiceData> {
    return prisma.fiscalInvoice.create({
      data: {
        tenantId: data.tenantId,
        orderId: data.orderId,
        type: data.type,
        totalAmount: data.totalAmount,
        items: { create: data.items },
      },
      include: { items: true },
    }) as unknown as FiscalInvoiceData;
  }

  async findInvoiceById(id: string, tenantId: string): Promise<FiscalInvoiceData | null> {
    return prisma.fiscalInvoice.findFirst({ where: { id, tenantId }, include: { items: true, order: { select: { number: true, client: { select: { name: true } } } } } }) as unknown as FiscalInvoiceData | null;
  }

  async findInvoicesByOrder(orderId: string, tenantId: string): Promise<FiscalInvoiceData[]> {
    return prisma.fiscalInvoice.findMany({ where: { orderId, tenantId }, orderBy: { createdAt: "desc" } }) as unknown as FiscalInvoiceData[];
  }

  async findAllInvoices(tenantId: string, filters?: { status?: string; type?: string }): Promise<FiscalInvoiceData[]> {
    const where: Prisma.FiscalInvoiceWhereInput = { tenantId };
    if (filters?.status) where.status = filters.status as FiscalInvoiceStatus;
    if (filters?.type) where.type = filters.type as FiscalInvoiceType;
    return prisma.fiscalInvoice.findMany({
      where,
      include: { order: { select: { number: true, client: { select: { name: true } } } } },
      orderBy: { createdAt: "desc" },
    }) as unknown as FiscalInvoiceData[];
  }

  async updateInvoiceStatus(id: string, data: { status: string; number?: number; series?: number; accessKey?: string; protocolNumber?: string; xmlContent?: string; issueDate?: Date; lastError?: string; retryCount?: number }): Promise<FiscalInvoiceData> {
    return prisma.fiscalInvoice.update({ where: { id }, data: { ...data, status: data.status as FiscalInvoiceStatus } }) as unknown as FiscalInvoiceData;
  }

  async cancelInvoice(id: string, reason: string): Promise<FiscalInvoiceData> {
    return prisma.fiscalInvoice.update({
      where: { id },
      data: { status: "CANCELLED", cancelDate: new Date(), cancelReason: reason },
    }) as unknown as FiscalInvoiceData;
  }

  async incrementNextNumber(tenantId: string, type: "NFE" | "NFSE"): Promise<number> {
    const field = type === "NFE" ? "nextNfeNumber" : "nextNfseNumber";
    const config = await prisma.fiscalConfig.update({
      where: { tenantId },
      data: { [field]: { increment: 1 } },
    });
    return (config as unknown as Record<string, number>)[field] - 1; // retorna o número usado (antes do increment)
  }
}
