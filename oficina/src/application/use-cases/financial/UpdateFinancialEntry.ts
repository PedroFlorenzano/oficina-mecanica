import { IFinancialEntryRepository, FinancialEntryData } from "@/domain/repositories/IFinancialEntryRepository";
import { NotFoundError, ValidationError } from "@/domain/errors/DomainError";

export interface UpdateFinancialEntryDTO {
  id: string;
  description?: string;
  category?: string;
  amount?: number;
  dueDate?: string;
  supplier?: string | null;
  notes?: string | null;
}

export class UpdateFinancialEntry {
  constructor(private readonly repo: IFinancialEntryRepository) {}

  async execute(
    input: UpdateFinancialEntryDTO,
    tenantId: string
  ): Promise<FinancialEntryData> {
    const entry = await this.repo.findById(input.id, tenantId);
    if (!entry) {
      throw new NotFoundError("Lançamento não encontrado");
    }
    if (entry.status === "PAID") {
      throw new ValidationError("Não é possível editar um lançamento já pago");
    }

    return this.repo.update(input.id, {
      description: input.description,
      category: input.category,
      amount: input.amount,
      dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
      supplier: input.supplier,
      notes: input.notes,
    });
  }
}

export class DeleteFinancialEntry {
  constructor(private readonly repo: IFinancialEntryRepository) {}

  async execute(id: string, tenantId: string): Promise<void> {
    const entry = await this.repo.findById(id, tenantId);
    if (!entry) {
      throw new NotFoundError("Lançamento não encontrado");
    }

    await this.repo.delete(id);
  }
}
