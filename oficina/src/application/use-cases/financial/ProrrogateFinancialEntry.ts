import { IFinancialEntryRepository, FinancialEntryData } from "@/domain/repositories/IFinancialEntryRepository";
import { NotFoundError, ValidationError } from "@/domain/errors/DomainError";

export interface ProrrogateFinancialEntryDTO {
  id: string;
  newDueDate: string; // ISO date
}

export class ProrrogateFinancialEntry {
  constructor(private readonly repo: IFinancialEntryRepository) {}

  async execute(
    input: ProrrogateFinancialEntryDTO,
    tenantId: string
  ): Promise<FinancialEntryData> {
    const entry = await this.repo.findById(input.id, tenantId);
    if (!entry) {
      throw new NotFoundError("Lançamento não encontrado");
    }
    if (entry.status === "PAID") {
      throw new ValidationError("Não é possível prorrogar um lançamento já pago");
    }

    const newDueDate = new Date(input.newDueDate);
    if (isNaN(newDueDate.getTime())) {
      throw new ValidationError("Data de vencimento inválida");
    }

    return this.repo.prorrogate(input.id, newDueDate);
  }
}
