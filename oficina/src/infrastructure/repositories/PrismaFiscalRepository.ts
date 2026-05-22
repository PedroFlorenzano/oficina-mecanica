import { prisma } from "@/infrastructure/database/prisma";
import { IFiscalRepository, FiscalConfigData, CreateInvoiceData } from "@/domain/repositories/IFiscalRepository";

export class PrismaFiscalRepository implements IFiscalRepository {
  async getConfig(tenantId: string): Promise<FiscalConfigData | null> {
    return prisma.fiscalConfig.findUnique({ where: { tenantId } }) as unknown as Promise<FiscalConfigData | null>;
  }

  async upsertConfig(tenantId: string, data: Partial<FiscalConfigData>): Promise<FiscalConfigData> {
    const { tenantId: _, ...rest } = data as any;
    return prisma.fiscalConfig.upsert({
      where: { tenantId },
      update: rest,
      create: { tenantId, ...rest },
    }) as unknown as Promise<FiscalConfigData>;
  }

  async createInvoice(data: CreateInvoiceData): Promise<any> {
    return prisma.fiscalInvoice.create({
      data: {
        tenantId: data.tenantId,
        orderId: data.orderId,
        type: data.type,
        totalAmount: data.totalAmount,
        items: { create: data.items },
      },
      include: { items: true },
    });
  }

  async findInvoiceById(id: string, tenantId: string): Promise<any | null> {
    return prisma.fiscalInvoice.findFirst({ where: { id, tenantId }, include: { items: true, order: { select: { number: true, client: { select: { name: true } } } } } });
  }

  async findInvoicesByOrder(orderId: string, tenantId: string): Promise<any[]> {
    return prisma.fiscalInvoice.findMany({ where: { orderId, tenantId }, orderBy: { createdAt: "desc" } });
  }

  async findAllInvoices(tenantId: string, filters?: { status?: string; type?: string }): Promise<any[]> {
    const where: any = { tenantId };
    if (filters?.status) where.status = filters.status;
    if (filters?.type) where.type = filters.type;
    return prisma.fiscalInvoice.findMany({
      where,
      include: { order: { select: { number: true, client: { select: { name: true } } } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async updateInvoiceStatus(id: string, data: any): Promise<any> {
    return prisma.fiscalInvoice.update({ where: { id }, data });
  }

  async cancelInvoice(id: string, reason: string): Promise<any> {
    return prisma.fiscalInvoice.update({
      where: { id },
      data: { status: "CANCELLED", cancelDate: new Date(), cancelReason: reason },
    });
  }

  async incrementNextNumber(tenantId: string, type: "NFE" | "NFSE"): Promise<number> {
    const field = type === "NFE" ? "nextNfeNumber" : "nextNfseNumber";
    const config = await prisma.fiscalConfig.update({
      where: { tenantId },
      data: { [field]: { increment: 1 } },
    });
    return (config as any)[field] - 1; // retorna o número usado (antes do increment)
  }
}
