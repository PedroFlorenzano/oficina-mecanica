import { parseVia, getViaPolicy, ORDER_VIAS } from "../osVia";

describe("parseVia", () => {
  it("usa interna como padrão quando ausente", () => {
    expect(parseVia(undefined)).toBe("interna");
    expect(parseVia(null)).toBe("interna");
    expect(parseVia("")).toBe("interna");
  });

  it("reconhece cada via válida, ignorando caixa e espaços", () => {
    expect(parseVia("interna")).toBe("interna");
    expect(parseVia("MECANICO")).toBe("mecanico");
    expect(parseVia(" patio ")).toBe("patio");
    expect(parseVia("Cliente")).toBe("cliente");
  });

  it("cai em interna para valores desconhecidos", () => {
    expect(parseVia("qualquer")).toBe("interna");
    expect(parseVia("admin")).toBe("interna");
  });
});

describe("getViaPolicy", () => {
  it("interna mostra tudo: valores por linha, totais e código da peça", () => {
    const p = getViaPolicy("interna");
    expect(p.showMoney).toBe(true);
    expect(p.showClient).toBe(true);
    expect(p.showServiceLineValue).toBe(true);
    expect(p.showPartLineValue).toBe(true);
    expect(p.showTotals).toBe(true);
    expect(p.partIdentifier).toBe("code");
  });

  it("mecanico esconde qualquer valor monetário e mostra tempo total", () => {
    const p = getViaPolicy("mecanico");
    expect(p.showMoney).toBe(false);
    expect(p.showServiceLineValue).toBe(false);
    expect(p.showPartLineValue).toBe(false);
    expect(p.showTotals).toBe(false);
    expect(p.showServiceTime).toBe(true);
    expect(p.showTotalTime).toBe(true);
  });

  it("patio esconde dados do cliente e valores", () => {
    const p = getViaPolicy("patio");
    expect(p.showClient).toBe(false);
    expect(p.showMoney).toBe(false);
    expect(p.showTotals).toBe(false);
    expect(p.showServiceTime).toBe(true);
  });

  it("cliente mostra marca da peça, unitário/total por peça e só o total dos serviços", () => {
    const p = getViaPolicy("cliente");
    expect(p.showClient).toBe(true);
    expect(p.showMoney).toBe(true);
    expect(p.partIdentifier).toBe("brand");
    expect(p.showPartLineValue).toBe(true); // unitário + total por peça
    expect(p.showServiceLineValue).toBe(false); // sem valor por serviço
    expect(p.showTotals).toBe(true);
  });

  it("nenhuma via monetária sem totais é inconsistente (mecanico/patio não têm totais)", () => {
    for (const via of ORDER_VIAS) {
      const p = getViaPolicy(via);
      if (!p.showMoney) {
        expect(p.showServiceLineValue).toBe(false);
        expect(p.showPartLineValue).toBe(false);
        expect(p.showTotals).toBe(false);
      }
    }
  });
});
