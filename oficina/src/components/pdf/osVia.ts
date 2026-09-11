// Vias de impressão da OS.
//
// Cada "via" é um público diferente com regras próprias sobre o que aparece na
// impressão da Ordem de Serviço. A função `getViaPolicy` é a fonte única dessas
// regras — os documentos PDF apenas consultam o resultado.
//
// - interna  : uso da oficina. Tudo visível: valores por linha e código da peça.
// - mecanico : para o mecânico executar. SEM valores monetários; mostra o tempo
//              estimado por serviço e o total de tempo.
// - patio    : espelha o quadro físico. SEM dados pessoais do cliente — só placa,
//              modelo, data e serviços.
// - cliente  : a via que o cliente recebe. Mostra a MARCA da peça (não o código);
//              nas peças, unitário + total por peça + total geral de peças; nos
//              serviços, APENAS o total dos serviços (sem valor por serviço).

export type OrderVia = "interna" | "mecanico" | "patio" | "cliente";

export const ORDER_VIAS: OrderVia[] = ["interna", "mecanico", "patio", "cliente"];

const VIA_ALIASES: Record<string, OrderVia> = {
  interna: "interna",
  mecanico: "mecanico",
  patio: "patio",
  cliente: "cliente",
};

/**
 * Normaliza o valor recebido no query param `?via=`. Qualquer valor ausente ou
 * desconhecido cai em `interna` (comportamento histórico preservado).
 */
export function parseVia(value?: string | null): OrderVia {
  if (!value) return "interna";
  return VIA_ALIASES[value.trim().toLowerCase()] ?? "interna";
}

export interface ViaPolicy {
  via: OrderVia;
  /** Rótulo humano para cabeçalho/badge da impressão. */
  label: string;
  /** Exibe qualquer valor monetário (unitários, totais por linha, totais gerais). */
  showMoney: boolean;
  /** Exibe o bloco de dados do cliente (nome, documento, telefone, e-mail, endereço). */
  showClient: boolean;
  /** Exibe a coluna de tempo estimado nos serviços. */
  showServiceTime: boolean;
  /** Exibe o total consolidado de tempo estimado. */
  showTotalTime: boolean;
  /** Exibe o valor de cada serviço individualmente. */
  showServiceLineValue: boolean;
  /** Exibe unitário e total por peça. */
  showPartLineValue: boolean;
  /** Exibe os blocos de total geral (serviços/peças/total). */
  showTotals: boolean;
  /** O que identifica a peça na coluna própria. */
  partIdentifier: "code" | "brand" | "none";
}

export function getViaPolicy(via: OrderVia): ViaPolicy {
  switch (via) {
    case "mecanico":
      return {
        via,
        label: "Via do Mecânico",
        showMoney: false,
        showClient: true,
        showServiceTime: true,
        showTotalTime: true,
        showServiceLineValue: false,
        showPartLineValue: false,
        showTotals: false,
        partIdentifier: "code",
      };
    case "patio":
      return {
        via,
        label: "Via do Pátio",
        showMoney: false,
        showClient: false,
        showServiceTime: true,
        showTotalTime: true,
        showServiceLineValue: false,
        showPartLineValue: false,
        showTotals: false,
        partIdentifier: "code",
      };
    case "cliente":
      return {
        via,
        label: "Via do Cliente",
        showMoney: true,
        showClient: true,
        showServiceTime: false,
        showTotalTime: false,
        showServiceLineValue: false, // só o total dos serviços (item 31)
        showPartLineValue: true, // unitário + total por peça (item 31)
        showTotals: true,
        partIdentifier: "brand", // marca em vez do código (item 30)
      };
    case "interna":
    default:
      return {
        via: "interna",
        label: "Via Interna",
        showMoney: true,
        showClient: true,
        showServiceTime: true,
        showTotalTime: true,
        showServiceLineValue: true,
        showPartLineValue: true,
        showTotals: true,
        partIdentifier: "code", // código da peça (item 30)
      };
  }
}
