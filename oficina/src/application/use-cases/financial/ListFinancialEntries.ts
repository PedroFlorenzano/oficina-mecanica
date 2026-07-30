import { IFinancialEntryRepository, FinancialEntryData, FinancialEntryFilters } from "@/domain/repositories/IFinancialEntryRepository";

export interface ListFinancialEntriesDTO {
  status?: "PENDING" | "OVERDUE" | "PAID" | "ALL";
  category?: string;
  startDate?: string;
  endDate?: string;
  supplier?: string;
}

export class ListFinancialEntries {
  constructor(private readonly repo: IFinancialEntryRepository) {}

  async execute(
    input: ListFinancialEntriesDTO,
    tenantId: string
  ): Promise<FinancialEntryData[]> {
    const filters: FinancialEntryFilters = {
      status: input.status || "ALL",
      category: input.category,
      startDate: input.startDate ? new Date(input.startDate) : undefined,
      endDate: input.endDate ? new Date(input.endDate) : undefined,
      supplier: input.supplier,
    };

    return this.repo.findAll(tenantId, filters);
  }
}
