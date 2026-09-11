import { renderTemplate } from "@/application/use-cases/whatsapp/renderTemplate";
import { DEFAULT_STATUS_TEMPLATE } from "@/application/use-cases/whatsapp/SendStatusNotification";

describe("renderTemplate", () => {
  const vars = {
    cliente: "João Silva",
    veiculo: "Gol 1.6",
    placa: "ABC1D23",
    os: "1042",
    oficina: "Paiffer Bosch",
    status: "Em Andamento",
    link: "https://operare.tech/sign/abc",
  };

  it("substitui todas as variáveis suportadas", () => {
    const out = renderTemplate(
      "{cliente} / {veiculo} / {placa} / {os} / {oficina} / {status} / {link}",
      vars
    );
    expect(out).toBe(
      "João Silva / Gol 1.6 / ABC1D23 / 1042 / Paiffer Bosch / Em Andamento / https://operare.tech/sign/abc"
    );
  });

  it("substitui a mesma variável várias vezes", () => {
    expect(renderTemplate("{cliente}, {cliente}!", vars)).toBe("João Silva, João Silva!");
  });

  it("substitui variável ausente por string vazia", () => {
    expect(renderTemplate("Olá {cliente}{link}", { cliente: "Ana" })).toBe("Olá Ana");
  });

  it("é case-insensitive e tolera espaços dentro das chaves", () => {
    expect(renderTemplate("{ Cliente } dirige o { VEICULO }", vars)).toBe(
      "João Silva dirige o Gol 1.6"
    );
  });

  it("ignora placeholders desconhecidos, virando vazio", () => {
    expect(renderTemplate("valor: {desconhecido}", vars)).toBe("valor: ");
  });

  it("preserva chaves que não são placeholders válidos", () => {
    expect(renderTemplate("{123} texto {} normal", vars)).toBe("{123} texto {} normal");
  });

  it("retorna string vazia para template vazio", () => {
    expect(renderTemplate("", vars)).toBe("");
  });

  it("renderiza o template padrão de status com os dados da OS", () => {
    const out = renderTemplate(DEFAULT_STATUS_TEMPLATE, vars);
    expect(out).toContain("*Paiffer Bosch*");
    expect(out).toContain("Olá, João Silva!");
    expect(out).toContain("OS *#1042* (Gol 1.6 - ABC1D23)");
    expect(out).toContain("*Em Andamento*");
  });
});
