import { IFinancialEntryRepository, FinancialEntryData } from "@/domain/repositories/IFinancialEntryRepository";
import { NotFoundError, ValidationError } from "@/domain/errors/DomainError";

export interface PayFinancialEntryDTO {
  id: string;
  paidAt?: string; // ISO date, default = today
  paidAmount?: number; // Se diferente do valor original (juros/desconto)
}

export class PayFinancialEntry {
  constructor(private readonly repo: IFinancialEntryRepository) {}

  async execute(
    input: PayFinancialEntryDTO,
    tenantId: string
  ): Promise<FinancialEntryData> {
    const entry = await this.repo.findById(input.id, tenantId);
    if (!entry) {
      throw new NotFoundError("Lançamento não encontrado");
    }
    if (entry.status === "PAID") {
      throw new ValidationError("Este lançamento já foi pago");
    }

    const paidAt = input.paidAt ? new Date(input.paidAt) : new Date();
    const paidAmount = input.paidAmount || entry.amount;

    return this.repo.markAsPaid(input.id, paidAt, paidAmount);
  }
}
