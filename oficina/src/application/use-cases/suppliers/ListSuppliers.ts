import { ISupplierRepository, SupplierData } from "@/domain/repositories/ISupplierRepository";

export class ListSuppliers {
  constructor(private readonly supplierRepo: ISupplierRepository) {}

  async execute(tenantId: string): Promise<SupplierData[]> {
    return this.supplierRepo.findByTenant(tenantId);
  }
}
