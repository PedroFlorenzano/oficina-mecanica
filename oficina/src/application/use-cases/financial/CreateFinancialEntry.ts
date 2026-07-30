import { IFinancialEntryRepository, FinancialEntryData, CreateFinancialEntryInput } from "@/domain/repositories/IFinancialEntryRepository";
import { ValidationError } from "@/domain/errors/DomainError";

export interface CreateFinancialEntryDTO {
  description: string;
  type?: "PAYABLE" | "RECEIVABLE";
  category: string;
  amount: number;
  dueDate: string; // ISO date
  totalInstallments?: number;
  supplier?: string;
  notes?: string;
}

export class CreateFinancialEntry {
  constructor(private readonly repo: IFinancialEntryRepository) {}

  async execute(
    input: CreateFinancialEntryDTO,
    tenantId: string,
    userId?: string
  ): Promise<FinancialEntryData[]> {
    if (!input.description?.trim()) {
      throw new ValidationError("Descrição é obrigatória");
    }
    if (!input.amount || input.amount <= 0) {
      throw new ValidationError("Valor deve ser maior que zero");
    }
    if (!input.dueDate) {
      throw new ValidationError("Data de vencimento é obrigatória");
    }
    if (!input.category) {
      throw new ValidationError("Categoria é obrigatória");
    }

    const totalInstallments = input.totalInstallments || 1;
    if (totalInstallments < 1 || totalInstallments > 60) {
      throw new ValidationError("Número de parcelas deve ser entre 1 e 60");
    }

    const baseDate = new Date(input.dueDate);
    const entries: FinancialEntryData[] = [];

    // Gera uma entrada por parcela
    for (let i = 0; i < totalInstallments; i++) {
      const dueDate = new Date(baseDate);
      dueDate.setMonth(dueDate.getMonth() + i);

      const data: CreateFinancialEntryInput = {
        description: totalInstallments > 1
          ? `${input.description} (${i + 1}/${totalInstallments})`
          : input.description,
        type: input.type || "PAYABLE",
        category: input.category,
        amount: input.amount,
        dueDate,
        installment: i + 1,
        totalInstallments,
        supplier: input.supplier || null,
        notes: input.notes || null,
        tenantId,
        createdBy: userId || null,
      };

      const entry = await this.repo.create(data);
      entries.push(entry);
    }

    return entries;
  }
}
