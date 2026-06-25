describe("Export CSV format", () => {
  const BOM = "\uFEFF";

  function buildCSV(orders: { number: number; status: string; clientName: string; document: string; plate: string; brand: string; model: string; mileage: number; services: { description: string }[]; parts: { description: string; quantity: number }[]; totalAmount: number; createdAt: Date }[]) {
    const header = "Nº;Status;Cliente;Documento;Placa;Veículo;KM;Serviços;Peças;Total;Data Abertura\n";
    const statusMap: Record<string, string> = {
      OPEN: "Aberta", IN_PROGRESS: "Em Execução", COMPLETED: "Concluída", DELIVERED: "Entregue",
    };
    const rows = orders.map((o) => {
      const services = o.services.map(s => s.description).join(" | ");
      const parts = o.parts.map(p => `${p.description} (${p.quantity}x)`).join(" | ");
      return [
        o.number,
        statusMap[o.status] || o.status,
        o.clientName,
        o.document,
        o.plate,
        `${o.brand} ${o.model}`,
        o.mileage,
        `"${services}"`,
        `"${parts}"`,
        o.totalAmount.toFixed(2).replace(".", ","),
        new Date(o.createdAt).toLocaleDateString("pt-BR"),
      ].join(";");
    }).join("\n");
    return BOM + header + rows;
  }

  it("gera header correto com BOM", () => {
    const csv = buildCSV([]);
    expect(csv.startsWith(BOM)).toBe(true);
    expect(csv).toContain("Nº;Status;Cliente;Documento;Placa;Veículo;KM;Serviços;Peças;Total;Data Abertura");
  });

  it("formata OS corretamente", () => {
    const csv = buildCSV([{
      number: 1,
      status: "COMPLETED",
      clientName: "João Silva",
      document: "123.456.789-00",
      plate: "ABC1D23",
      brand: "Fiat",
      model: "Uno",
      mileage: 50000,
      services: [{ description: "Troca de óleo" }, { description: "Filtro" }],
      parts: [{ description: "Óleo 5W30", quantity: 4 }],
      totalAmount: 350.5,
      createdAt: new Date("2026-06-20"),
    }]);

    expect(csv).toContain("1;Concluída;João Silva;123.456.789-00;ABC1D23;Fiat Uno;50000");
    expect(csv).toContain('"Troca de óleo | Filtro"');
    expect(csv).toContain('"Óleo 5W30 (4x)"');
    expect(csv).toContain("350,50");
  });

  it("lida com OS sem serviços nem peças", () => {
    const csv = buildCSV([{
      number: 2,
      status: "OPEN",
      clientName: "Maria",
      document: "00.000.000/0001-00",
      plate: "XYZ9K88",
      brand: "VW",
      model: "Gol",
      mileage: 10000,
      services: [],
      parts: [],
      totalAmount: 0,
      createdAt: new Date("2026-01-01"),
    }]);

    expect(csv).toContain('"";"";0,00');
  });
});
