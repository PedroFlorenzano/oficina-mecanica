import { CreateFinancialEntry } from "../CreateFinancialEntry";
import { ListFinancialEntries } from "../ListFinancialEntries";
import { PayFinancialEntry } from "../PayFinancialEntry";
import { ProrrogateFinancialEntry } from "../ProrrogateFinancialEntry";
import { UpdateFinancialEntry, DeleteFinancialEntry } from "../UpdateFinancialEntry";
import { IFinancialEntryRepository, FinancialEntryData, CreateFinancialEntryInput, FinancialEntryFilters } from "@/domain/repositories/IFinancialEntryRepository";

// ============================================
// Mock Repository
// ============================================

function createMockRepo(): jest.Mocked<IFinancialEntryRepository> {
  const entries: FinancialEntryData[] = [];
  let idCounter = 1;

  return {
    create: jest.fn(async (data: CreateFinancialEntryInput) => {
      const entry: FinancialEntryData = {
        id: `entry-${idCounter++}`,
        description: data.description,
        type: data.type,
        category: data.category,
        status: "PENDING",
        amount: data.amount,
        dueDate: data.dueDate,
        paidAt: null,
        paidAmount: null,
        installment: data.installment || 1,
        totalInstallments: data.totalInstallments || 1,
        supplier: data.supplier || null,
        notes: data.notes || null,
        tenantId: data.tenantId,
        createdBy: data.createdBy || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      entries.push(entry);
      return entry;
    }),
    findById: jest.fn(async (id: string, _tenantId: string) => {
      return entries.find((e) => e.id === id) || null;
    }),
    findAll: jest.fn(async (_tenantId: string, _filters?: FinancialEntryFilters) => {
      return entries;
    }),
    update: jest.fn(async (id: string, data) => {
      const entry = entries.find((e) => e.id === id);
      if (!entry) throw new Error("Not found");
      if (data.description) entry.description = data.description;
      if (data.amount) entry.amount = data.amount;
      if (data.dueDate) entry.dueDate = data.dueDate;
      if (data.category) entry.category = data.category;
      if (data.supplier !== undefined) entry.supplier = data.supplier || null;
      if (data.notes !== undefined) entry.notes = data.notes || null;
      return entry;
    }),
    markAsPaid: jest.fn(async (id: string, paidAt: Date, paidAmount?: number) => {
      const entry = entries.find((e) => e.id === id);
      if (!entry) throw new Error("Not found");
      entry.status = "PAID";
      entry.paidAt = paidAt;
      entry.paidAmount = paidAmount || entry.amount;
      return entry;
    }),
    prorrogate: jest.fn(async (id: string, newDueDate: Date) => {
      const entry = entries.find((e) => e.id === id);
      if (!entry) throw new Error("Not found");
      entry.dueDate = newDueDate;
      entry.status = "PENDING";
      return entry;
    }),
    delete: jest.fn(async (id: string) => {
      const idx = entries.findIndex((e) => e.id === id);
      if (idx >= 0) entries.splice(idx, 1);
    }),
    getSummary: jest.fn(async (_tenantId: string, _startDate: Date, _endDate: Date) => ({
      totalPayable: 0,
      totalReceivable: 0,
      totalPaid: 0,
      totalOverdue: 0,
      byCategory: [] as Array<{ category: string; total: number }>,
    })),
  };
}

// ============================================
// Tests: CreateFinancialEntry
// ============================================

describe("CreateFinancialEntry", () => {
  let repo: jest.Mocked<IFinancialEntryRepository>;
  let useCase: CreateFinancialEntry;

  beforeEach(() => {
    repo = createMockRepo();
    useCase = new CreateFinancialEntry(repo);
  });

  it("deve criar lançamento simples (1 parcela)", async () => {
    const result = await useCase.execute(
      {
        description: "Aluguel julho",
        category: "RENT",
        amount: 3500,
        dueDate: "2026-07-15",
      },
      "tenant-1",
      "user-1"
    );

    expect(result).toHaveLength(1);
    expect(result[0].description).toBe("Aluguel julho");
    expect(result[0].category).toBe("RENT");
    expect(result[0].amount).toBe(3500);
    expect(result[0].installment).toBe(1);
    expect(result[0].totalInstallments).toBe(1);
    expect(result[0].tenantId).toBe("tenant-1");
    expect(result[0].createdBy).toBe("user-1");
    expect(repo.create).toHaveBeenCalledTimes(1);
  });

  it("deve gerar múltiplas parcelas com vencimentos mensais", async () => {
    const result = await useCase.execute(
      {
        description: "Boleto Robert Bosch",
        category: "PARTS_SUPPLIER",
        amount: 1200,
        dueDate: "2026-08-10",
        totalInstallments: 3,
        supplier: "Robert Bosch",
      },
      "tenant-1"
    );

    expect(result).toHaveLength(3);
    expect(result[0].description).toBe("Boleto Robert Bosch (1/3)");
    expect(result[1].description).toBe("Boleto Robert Bosch (2/3)");
    expect(result[2].description).toBe("Boleto Robert Bosch (3/3)");
    expect(result[0].installment).toBe(1);
    expect(result[1].installment).toBe(2);
    expect(result[2].installment).toBe(3);
    expect(result[0].amount).toBe(1200);
    expect(result[1].amount).toBe(1200);

    // Vencimentos mensais
    const d0 = new Date(result[0].dueDate);
    const d1 = new Date(result[1].dueDate);
    const d2 = new Date(result[2].dueDate);
    expect(d0.getMonth()).toBe(7); // agosto
    expect(d1.getMonth()).toBe(8); // setembro
    expect(d2.getMonth()).toBe(9); // outubro

    expect(repo.create).toHaveBeenCalledTimes(3);
  });

  it("deve rejeitar descrição vazia", async () => {
    await expect(
      useCase.execute(
        { description: "", category: "RENT", amount: 100, dueDate: "2026-08-01" },
        "tenant-1"
      )
    ).rejects.toThrow("Descrição é obrigatória");
  });

  it("deve rejeitar valor zero ou negativo", async () => {
    await expect(
      useCase.execute(
        { description: "Teste", category: "RENT", amount: 0, dueDate: "2026-08-01" },
        "tenant-1"
      )
    ).rejects.toThrow("Valor deve ser maior que zero");

    await expect(
      useCase.execute(
        { description: "Teste", category: "RENT", amount: -50, dueDate: "2026-08-01" },
        "tenant-1"
      )
    ).rejects.toThrow("Valor deve ser maior que zero");
  });

  it("deve rejeitar vencimento vazio", async () => {
    await expect(
      useCase.execute(
        { description: "Teste", category: "RENT", amount: 100, dueDate: "" },
        "tenant-1"
      )
    ).rejects.toThrow("Data de vencimento é obrigatória");
  });

  it("deve rejeitar categoria vazia", async () => {
    await expect(
      useCase.execute(
        { description: "Teste", category: "", amount: 100, dueDate: "2026-08-01" },
        "tenant-1"
      )
    ).rejects.toThrow("Categoria é obrigatória");
  });

  it("deve rejeitar parcelas fora do range (1-60)", async () => {
    await expect(
      useCase.execute(
        { description: "Teste", category: "RENT", amount: 100, dueDate: "2026-08-01", totalInstallments: 0 },
        "tenant-1"
      )
    ).rejects.toThrow("Número de parcelas deve ser entre 1 e 60");

    await expect(
      useCase.execute(
        { description: "Teste", category: "RENT", amount: 100, dueDate: "2026-08-01", totalInstallments: 61 },
        "tenant-1"
      )
    ).rejects.toThrow("Número de parcelas deve ser entre 1 e 60");
  });

  it("deve usar tipo PAYABLE como padrão", async () => {
    const result = await useCase.execute(
      { description: "Conta", category: "ENERGY", amount: 200, dueDate: "2026-08-01" },
      "tenant-1"
    );
    expect(result[0].type).toBe("PAYABLE");
  });
});

// ============================================
// Tests: ListFinancialEntries
// ============================================

describe("ListFinancialEntries", () => {
  it("deve chamar findAll com filtros", async () => {
    const repo = createMockRepo();
    const useCase = new ListFinancialEntries(repo);

    await useCase.execute(
      { status: "PENDING", category: "RENT" },
      "tenant-1"
    );

    expect(repo.findAll).toHaveBeenCalledWith("tenant-1", {
      status: "PENDING",
      category: "RENT",
      startDate: undefined,
      endDate: undefined,
      supplier: undefined,
    });
  });

  it("deve usar status ALL por padrão", async () => {
    const repo = createMockRepo();
    const useCase = new ListFinancialEntries(repo);

    await useCase.execute({}, "tenant-1");

    expect(repo.findAll).toHaveBeenCalledWith("tenant-1", expect.objectContaining({
      status: "ALL",
    }));
  });
});

// ============================================
// Tests: PayFinancialEntry
// ============================================

describe("PayFinancialEntry", () => {
  let repo: jest.Mocked<IFinancialEntryRepository>;
  let useCase: PayFinancialEntry;

  beforeEach(async () => {
    repo = createMockRepo();
    useCase = new PayFinancialEntry(repo);
    // Criar um lançamento pendente
    await repo.create({
      description: "Conta energia",
      type: "PAYABLE",
      category: "ENERGY",
      amount: 350,
      dueDate: new Date("2026-07-20"),
      tenantId: "tenant-1",
    });
  });

  it("deve dar baixa em lançamento pendente", async () => {
    const result = await useCase.execute(
      { id: "entry-1" },
      "tenant-1"
    );

    expect(result.status).toBe("PAID");
    expect(result.paidAt).toBeTruthy();
    expect(repo.markAsPaid).toHaveBeenCalledWith("entry-1", expect.any(Date), 350);
  });

  it("deve aceitar valor diferente do original (juros/desconto)", async () => {
    await useCase.execute(
      { id: "entry-1", paidAmount: 365 },
      "tenant-1"
    );

    expect(repo.markAsPaid).toHaveBeenCalledWith("entry-1", expect.any(Date), 365);
  });

  it("deve aceitar data específica de pagamento", async () => {
    await useCase.execute(
      { id: "entry-1", paidAt: "2026-07-25" },
      "tenant-1"
    );

    const callArgs = repo.markAsPaid.mock.calls[0];
    const paidAt = callArgs[1] as Date;
    expect(paidAt.toISOString().startsWith("2026-07-25")).toBe(true);
  });

  it("deve rejeitar baixa de lançamento já pago", async () => {
    // Dar baixa
    await useCase.execute({ id: "entry-1" }, "tenant-1");

    // Tentar dar baixa novamente
    await expect(
      useCase.execute({ id: "entry-1" }, "tenant-1")
    ).rejects.toThrow("Este lançamento já foi pago");
  });

  it("deve rejeitar lançamento inexistente", async () => {
    await expect(
      useCase.execute({ id: "nao-existe" }, "tenant-1")
    ).rejects.toThrow("Lançamento não encontrado");
  });
});

// ============================================
// Tests: ProrrogateFinancialEntry
// ============================================

describe("ProrrogateFinancialEntry", () => {
  let repo: jest.Mocked<IFinancialEntryRepository>;
  let useCase: ProrrogateFinancialEntry;

  beforeEach(async () => {
    repo = createMockRepo();
    useCase = new ProrrogateFinancialEntry(repo);
    await repo.create({
      description: "Boleto fornecedor",
      type: "PAYABLE",
      category: "PARTS_SUPPLIER",
      amount: 800,
      dueDate: new Date("2026-07-15"),
      tenantId: "tenant-1",
    });
  });

  it("deve prorrogar vencimento", async () => {
    const result = await useCase.execute(
      { id: "entry-1", newDueDate: "2026-08-15" },
      "tenant-1"
    );

    expect(result.status).toBe("PENDING");
    expect(new Date(result.dueDate).toISOString().startsWith("2026-08-15")).toBe(true);
    expect(repo.prorrogate).toHaveBeenCalledWith("entry-1", expect.any(Date));
  });

  it("deve rejeitar prorrogação de lançamento já pago", async () => {
    // Marcar como pago
    const entry = repo.findById.mock.results[0]?.value || await repo.findById("entry-1", "tenant-1");
    if (entry) (entry as FinancialEntryData).status = "PAID";

    await expect(
      useCase.execute({ id: "entry-1", newDueDate: "2026-08-15" }, "tenant-1")
    ).rejects.toThrow("Não é possível prorrogar um lançamento já pago");
  });

  it("deve rejeitar lançamento inexistente", async () => {
    await expect(
      useCase.execute({ id: "nao-existe", newDueDate: "2026-08-15" }, "tenant-1")
    ).rejects.toThrow("Lançamento não encontrado");
  });

  it("deve rejeitar data inválida", async () => {
    await expect(
      useCase.execute({ id: "entry-1", newDueDate: "data-invalida" }, "tenant-1")
    ).rejects.toThrow("Data de vencimento inválida");
  });
});

// ============================================
// Tests: UpdateFinancialEntry
// ============================================

describe("UpdateFinancialEntry", () => {
  let repo: jest.Mocked<IFinancialEntryRepository>;
  let useCase: UpdateFinancialEntry;

  beforeEach(async () => {
    repo = createMockRepo();
    useCase = new UpdateFinancialEntry(repo);
    await repo.create({
      description: "Aluguel",
      type: "PAYABLE",
      category: "RENT",
      amount: 3000,
      dueDate: new Date("2026-07-10"),
      tenantId: "tenant-1",
    });
  });

  it("deve atualizar descrição e valor", async () => {
    const result = await useCase.execute(
      { id: "entry-1", description: "Aluguel reajustado", amount: 3200 },
      "tenant-1"
    );

    expect(result.description).toBe("Aluguel reajustado");
    expect(result.amount).toBe(3200);
  });

  it("deve rejeitar edição de lançamento já pago", async () => {
    const entry = await repo.findById("entry-1", "tenant-1");
    if (entry) entry.status = "PAID";

    await expect(
      useCase.execute({ id: "entry-1", description: "Novo" }, "tenant-1")
    ).rejects.toThrow("Não é possível editar um lançamento já pago");
  });

  it("deve rejeitar lançamento inexistente", async () => {
    await expect(
      useCase.execute({ id: "nao-existe", description: "X" }, "tenant-1")
    ).rejects.toThrow("Lançamento não encontrado");
  });
});

// ============================================
// Tests: DeleteFinancialEntry
// ============================================

describe("DeleteFinancialEntry", () => {
  let repo: jest.Mocked<IFinancialEntryRepository>;
  let useCase: DeleteFinancialEntry;

  beforeEach(async () => {
    repo = createMockRepo();
    useCase = new DeleteFinancialEntry(repo);
    await repo.create({
      description: "Para deletar",
      type: "PAYABLE",
      category: "OTHER_VARIABLE",
      amount: 100,
      dueDate: new Date("2026-07-10"),
      tenantId: "tenant-1",
    });
  });

  it("deve deletar lançamento existente", async () => {
    await useCase.execute("entry-1", "tenant-1");
    expect(repo.delete).toHaveBeenCalledWith("entry-1");
  });

  it("deve rejeitar deleção de lançamento inexistente", async () => {
    await expect(
      useCase.execute("nao-existe", "tenant-1")
    ).rejects.toThrow("Lançamento não encontrado");
  });
});
