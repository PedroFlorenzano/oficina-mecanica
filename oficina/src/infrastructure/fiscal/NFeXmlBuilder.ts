import { FiscalAdapterInput } from "./IFiscalAdapter";

export interface NFeConfig {
  tpAmb: 1 | 2; // 1=produção, 2=homologação
  cUF: string; // código UF (35=SP)
  cMunFG: string; // código município IBGE
  enderEmit: {
    xLgr: string;
    nro: string;
    xBairro: string;
    cMun: string;
    xMun: string;
    UF: string;
    CEP: string;
  };
}

/**
 * Monta XML da NF-e no layout 4.0 (nfe_v4.00.xsd).
 * Campos mínimos para aprovação em homologação.
 */
export class NFeXmlBuilder {
  constructor(private config: NFeConfig) {}

  build(input: FiscalAdapterInput): { xml: string; nfeId: string } {
    const cNF = this.gerarCodigoNumerico();
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const dhEmi = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}-03:00`;
    const mod = "55";
    const serie = String(input.series).padStart(3, "0");
    const nNF = String(input.number).padStart(9, "0");
    const tpEmis = "1"; // normal
    const cnpj14 = input.cnpj.replace(/\D/g, "").padStart(14, "0");

    // Chave de acesso sem DV
    const chaveBase = `${this.config.cUF}${this.aamm()}${cnpj14}${mod}${serie}${nNF}${tpEmis}${cNF}`;
    const cDV = this.mod11(chaveBase);
    const chaveAcesso = chaveBase + cDV;
    const nfeId = `NFe${chaveAcesso}`;

    // Razão social em homologação deve ser essa string
    const xNome = this.config.tpAmb === 2
      ? "NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL"
      : input.razaoSocial;

    const items = input.items.map((item, i) => this.buildDet(item, i + 1));
    const vProd = input.items.reduce((s, it) => s + it.totalPrice, 0);

    const xml = [
      `<NFe xmlns="http://www.portalfiscal.inf.br/nfe">`,
      `<infNFe Id="${nfeId}" versao="4.00">`,
      this.buildIde(input.number, input.series, cNF, dhEmi, cDV),
      this.buildEmit(cnpj14, xNome, input.inscricaoEstadual),
      this.buildDest(),
      ...items,
      this.buildTotal(vProd),
      this.buildTransp(),
      this.buildPag(vProd),
      this.buildInfAdic(),
      `</infNFe>`,
      `</NFe>`,
    ].join("");

    return { xml, nfeId };
  }

  private buildIde(nNF: number, serie: number, cNF: string, dhEmi: string, cDV: string): string {
    return [
      `<ide>`,
      `<cUF>${this.config.cUF}</cUF>`,
      `<cNF>${cNF}</cNF>`,
      `<natOp>VENDA DE MERCADORIA</natOp>`,
      `<mod>55</mod>`,
      `<serie>${serie}</serie>`,
      `<nNF>${nNF}</nNF>`,
      `<dhEmi>${dhEmi}</dhEmi>`,
      `<tpNF>1</tpNF>`,
      `<idDest>1</idDest>`,
      `<cMunFG>${this.config.cMunFG}</cMunFG>`,
      `<tpImp>1</tpImp>`,
      `<tpEmis>1</tpEmis>`,
      `<cDV>${cDV}</cDV>`,
      `<tpAmb>${this.config.tpAmb}</tpAmb>`,
      `<finNFe>1</finNFe>`,
      `<indFinal>1</indFinal>`,
      `<indPres>1</indPres>`,
      `<procEmi>0</procEmi>`,
      `<verProc>Operare1.0</verProc>`,
      `</ide>`,
    ].join("");
  }

  private buildEmit(cnpj: string, xNome: string, ie: string | null): string {
    const e = this.config.enderEmit;
    return [
      `<emit>`,
      `<CNPJ>${cnpj}</CNPJ>`,
      `<xNome>${xNome}</xNome>`,
      `<enderEmit>`,
      `<xLgr>${e.xLgr}</xLgr>`,
      `<nro>${e.nro}</nro>`,
      `<xBairro>${e.xBairro}</xBairro>`,
      `<cMun>${e.cMun}</cMun>`,
      `<xMun>${e.xMun}</xMun>`,
      `<UF>${e.UF}</UF>`,
      `<CEP>${e.CEP}</CEP>`,
      `<cPais>1058</cPais>`,
      `<xPais>Brasil</xPais>`,
      `</enderEmit>`,
      `<IE>${ie || ""}</IE>`,
      `<CRT>1</CRT>`,
      `</emit>`,
    ].join("");
  }

  private buildDest(): string {
    // Em homologação, destinatário fictício. O CNPJ deve ser válido para mod11.
    if (this.config.tpAmb === 2) {
      return [
        `<dest>`,
        `<CPF>00000000000</CPF>`,
        `<xNome>NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL</xNome>`,
        `<enderDest>`,
        `<xLgr>Rua Teste</xLgr>`,
        `<nro>1</nro>`,
        `<xBairro>Centro</xBairro>`,
        `<cMun>${this.config.cMunFG}</cMun>`,
        `<xMun>${this.config.enderEmit.xMun}</xMun>`,
        `<UF>${this.config.enderEmit.UF}</UF>`,
        `<CEP>${this.config.enderEmit.CEP}</CEP>`,
        `<cPais>1058</cPais>`,
        `<xPais>Brasil</xPais>`,
        `</enderDest>`,
        `<indIEDest>9</indIEDest>`,
        `</dest>`,
      ].join("");
    }
    // Produção: destinatário virá dos dados da OS (TODO)
    return `<dest><CPF>00000000000</CPF><xNome>CONSUMIDOR</xNome><indIEDest>9</indIEDest></dest>`;
  }

  private buildDet(item: FiscalAdapterInput["items"][0], nItem: number): string {
    const vProd = item.totalPrice.toFixed(2);
    const vUnCom = item.unitPrice.toFixed(4);
    const qCom = item.quantity.toFixed(4);
    const cfop = item.cfop || "5102";
    const ncm = item.ncm || "00000000";

    return [
      `<det nItem="${nItem}">`,
      `<prod>`,
      `<cProd>${nItem}</cProd>`,
      `<cEAN>SEM GTIN</cEAN>`,
      `<xProd>${this.config.tpAmb === 2 ? "NOTA FISCAL EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL" : this.escapeXml(item.description)}</xProd>`,
      `<NCM>${ncm}</NCM>`,
      `<CFOP>${cfop}</CFOP>`,
      `<uCom>UN</uCom>`,
      `<qCom>${qCom}</qCom>`,
      `<vUnCom>${vUnCom}</vUnCom>`,
      `<vProd>${vProd}</vProd>`,
      `<cEANTrib>SEM GTIN</cEANTrib>`,
      `<uTrib>UN</uTrib>`,
      `<qTrib>${qCom}</qTrib>`,
      `<vUnTrib>${vUnCom}</vUnTrib>`,
      `<indTot>1</indTot>`,
      `</prod>`,
      `<imposto>`,
      `<ICMS><ICMSSN102><orig>0</orig><CSOSN>102</CSOSN></ICMSSN102></ICMS>`,
      `<PIS><PISOutr><CST>99</CST><vBC>0.00</vBC><pPIS>0.00</pPIS><vPIS>0.00</vPIS></PISOutr></PIS>`,
      `<COFINS><COFINSOutr><CST>99</CST><vBC>0.00</vBC><pCOFINS>0.00</pCOFINS><vCOFINS>0.00</vCOFINS></COFINSOutr></COFINS>`,
      `</imposto>`,
      `</det>`,
    ].join("");
  }

  private buildTotal(vProd: number): string {
    const v = vProd.toFixed(2);
    return [
      `<total><ICMSTot>`,
      `<vBC>0.00</vBC><vICMS>0.00</vICMS><vICMSDeson>0.00</vICMSDeson>`,
      `<vFCPUFDest>0.00</vFCPUFDest><vICMSUFDest>0.00</vICMSUFDest><vICMSUFRemet>0.00</vICMSUFRemet>`,
      `<vFCP>0.00</vFCP><vBCST>0.00</vBCST><vST>0.00</vST><vFCPST>0.00</vFCPST>`,
      `<vFCPSTRet>0.00</vFCPSTRet><vProd>${v}</vProd><vFrete>0.00</vFrete>`,
      `<vSeg>0.00</vSeg><vDesc>0.00</vDesc><vII>0.00</vII><vIPI>0.00</vIPI>`,
      `<vIPIDevol>0.00</vIPIDevol><vPIS>0.00</vPIS><vCOFINS>0.00</vCOFINS>`,
      `<vOutro>0.00</vOutro><vNF>${v}</vNF>`,
      `</ICMSTot></total>`,
    ].join("");
  }

  private buildTransp(): string {
    return `<transp><modFrete>9</modFrete></transp>`;
  }

  private buildPag(vNF: number): string {
    return `<pag><detPag><tPag>01</tPag><vPag>${vNF.toFixed(2)}</vPag></detPag></pag>`;
  }

  private buildInfAdic(): string {
    return `<infAdic><infCpl>Nota emitida pelo sistema Operare</infCpl></infAdic>`;
  }

  private gerarCodigoNumerico(): string {
    return String(Math.floor(Math.random() * 99999999)).padStart(8, "0");
  }

  private aamm(): string {
    const d = new Date();
    return String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, "0");
  }

  private mod11(chave: string): string {
    const pesos = [2, 3, 4, 5, 6, 7, 8, 9];
    let soma = 0;
    const digits = chave.split("").reverse();
    for (let i = 0; i < digits.length; i++) {
      soma += parseInt(digits[i]) * pesos[i % pesos.length];
    }
    const resto = soma % 11;
    const dv = resto < 2 ? 0 : 11 - resto;
    return String(dv);
  }

  private escapeXml(str: string): string {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
}
