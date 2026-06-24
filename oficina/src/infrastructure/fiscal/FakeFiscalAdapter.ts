import { IFiscalAdapter, FiscalAdapterInput, FiscalAuthorization, FiscalCancellation } from "./IFiscalAdapter";

/**
 * Adapter simulado para desenvolvimento/homologação.
 * Gera XML mock e retorna autorização fictícia sem comunicação real com SEFAZ/Prefeitura.
 */
export class FakeFiscalAdapter implements IFiscalAdapter {
  async authorize(input: FiscalAdapterInput): Promise<FiscalAuthorization> {
    // Simula latência de rede (200-500ms)
    await new Promise(r => setTimeout(r, 200 + Math.random() * 300));

    const accessKey = this.generateAccessKey(input);
    const protocolNumber = this.generateProtocol();

    const xmlContent = input.type === "NFE"
      ? this.buildNFeXml(input, accessKey, protocolNumber)
      : this.buildNFSeXml(input, accessKey, protocolNumber);

    return {
      accessKey,
      protocolNumber,
      xmlContent,
      number: input.number,
      series: input.series,
      issueDate: new Date(),
    };
  }

  async cancel(accessKey: string, reason: string, _protocolNumber?: string): Promise<FiscalCancellation> {
    await new Promise(r => setTimeout(r, 200 + Math.random() * 300));

    const protocolNumber = this.generateProtocol();
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<procEventoNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">
  <evento><infEvento><chNFe>${accessKey}</chNFe><tpEvento>110111</tpEvento><xJust>${reason}</xJust></infEvento></evento>
  <retEvento><infEvento><cStat>135</cStat><xMotivo>Evento registrado e vinculado a NF-e</xMotivo><nProt>${protocolNumber}</nProt></infEvento></retEvento>
</procEventoNFe>`;

    return { protocolNumber, xmlContent };
  }

  private generateAccessKey(input: FiscalAdapterInput): string {
    const uf = "35"; // SP
    const aamm = new Date().toISOString().slice(2, 7).replace("-", "");
    const cnpj = (input.cnpj || "").replace(/\D/g, "").padEnd(14, "0");
    const mod = input.type === "NFE" ? "55" : "99";
    const serie = String(input.series).padStart(3, "0");
    const num = String(input.number).padStart(9, "0");
    const random = String(Math.floor(Math.random() * 99999999) + 1).padStart(8, "0");
    const base = `${uf}${aamm}${cnpj}${mod}${serie}${num}1${random}`;
    const dv = String(this.mod11(base));
    return (base + dv).slice(0, 44);
  }

  private generateProtocol(): string {
    const ts = Date.now().toString().slice(-10);
    const seq = String(Math.floor(Math.random() * 99999) + 1).padStart(5, "0");
    return `135${ts}${seq}`;
  }

  private mod11(value: string): number {
    let sum = 0;
    let weight = 2;
    for (let i = value.length - 1; i >= 0; i--) {
      sum += parseInt(value[i]) * weight;
      weight = weight === 9 ? 2 : weight + 1;
    }
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  }

  private buildNFeXml(input: FiscalAdapterInput, accessKey: string, protocol: string): string {
    const items = input.items.map((item, i) => `
      <det nItem="${i + 1}"><prod><xProd>${item.description}</xProd><qCom>${item.quantity}</qCom><vUnCom>${item.unitPrice.toFixed(2)}</vUnCom><vProd>${item.totalPrice.toFixed(2)}</vProd><CFOP>${item.cfop || "5102"}</CFOP><NCM>${item.ncm || "00000000"}</NCM></prod></det>`).join("");

    return `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe><infNFe Id="NFe${accessKey}" versao="4.00">
    <ide><cUF>35</cUF><natOp>VENDA</natOp><mod>55</mod><serie>${input.series}</serie><nNF>${input.number}</nNF><dhEmi>${new Date().toISOString()}</dhEmi></ide>
    <emit><CNPJ>${(input.cnpj || "").replace(/\D/g, "")}</CNPJ><xNome>${input.razaoSocial}</xNome><IE>${input.inscricaoEstadual || ""}</IE></emit>
    ${items}
    <total><ICMSTot><vProd>${input.totalAmount.toFixed(2)}</vProd><vNF>${input.totalAmount.toFixed(2)}</vNF></ICMSTot></total>
  </infNFe></NFe>
  <protNFe><infProt><cStat>100</cStat><xMotivo>Autorizado o uso da NF-e</xMotivo><chNFe>${accessKey}</chNFe><nProt>${protocol}</nProt></infProt></protNFe>
</nfeProc>`;
  }

  private buildNFSeXml(input: FiscalAdapterInput, accessKey: string, protocol: string): string {
    const items = input.items.map(item => `
      <Servico><Descricao>${item.description}</Descricao><Quantidade>${item.quantity}</Quantidade><ValorUnitario>${item.unitPrice.toFixed(2)}</ValorUnitario><ValorTotal>${item.totalPrice.toFixed(2)}</ValorTotal><CodigoServico>${item.serviceCode || "1401"}</CodigoServico></Servico>`).join("");

    return `<?xml version="1.0" encoding="UTF-8"?>
<CompNfse xmlns="http://www.abrasf.org.br/nfse.xsd">
  <Nfse><InfNfse Id="${accessKey}">
    <Numero>${input.number}</Numero><CodigoVerificacao>${protocol}</CodigoVerificacao>
    <DataEmissao>${new Date().toISOString()}</DataEmissao>
    <Prestador><Cnpj>${(input.cnpj || "").replace(/\D/g, "")}</Cnpj><RazaoSocial>${input.razaoSocial}</RazaoSocial><InscricaoMunicipal>${input.inscricaoMunicipal || ""}</InscricaoMunicipal></Prestador>
    <Servicos>${items}</Servicos>
    <Valores><ValorServicos>${input.totalAmount.toFixed(2)}</ValorServicos></Valores>
  </InfNfse></Nfse>
</CompNfse>`;
  }
}
