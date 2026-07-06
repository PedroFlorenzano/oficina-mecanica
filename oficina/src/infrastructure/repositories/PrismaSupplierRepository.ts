import { PrismaClient } from "@prisma/client";
import {
  ISupplierRepository,
  SupplierData,
  CreateSupplierInput,
  UpdateSupplierInput,
} from "@/domain/repositories/ISupplierRepository";

export class PrismaSupplierRepository implements ISupplierRepository {
  constructor(private readonly db: PrismaClient) {}

  async findById(id: string): Promise<SupplierData | null> {
    return this.db.supplier.findUnique({ where: { id } });
  }

  async findByTenant(tenantId: string): Promise<SupplierData[]> {
    return this.db.supplier.findMany({
      where: { tenantId, active: true },
      orderBy: { name: "asc" },
    });
  }

  async findByCnpj(cnpj: string, tenantId: string): Promise<SupplierData | null> {
    return this.db.supplier.findUnique({
      where: { cnpj_tenantId: { cnpj, tenantId } },
    });
  }

  async create(data: CreateSupplierInput): Promise<SupplierData> {
    return this.db.supplier.create({
      data: {
        name: data.name,
        cnpj: data.cnpj ?? null,
        phone: data.phone ?? null,
        email: data.email ?? null,
        website: data.website ?? null,
        affiliateUrl: data.affiliateUrl ?? null,
        affiliateCode: data.affiliateCode ?? null,
        defaultLeadTimeDays: data.defaultLeadTimeDays ?? 3,
        active: data.active ?? true,
        tenantId: data.tenantId,
      },
    });
  }

  async update(id: string, data: UpdateSupplierInput): Promise<SupplierData> {
    return this.db.supplier.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    await this.db.supplier.delete({ where: { id } });
  }

  async hasLinkedStockItems(id: string): Promise<boolean> {
    const count = await this.db.stockItem.count({
      where: { supplierId: id, active: true },
    });
    return count > 0;
  }
}
