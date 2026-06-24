import * as https from "https";
import { XMLParser } from "fast-xml-parser";
import { IFiscalAdapter, FiscalAdapterInput, FiscalAuthorization, FiscalCancellation } from "./IFiscalAdapter";
import { CertificateManager } from "./CertificateManager";
import { XmlSigner } from "./XmlSigner";
import { NFeXmlBuilder, NFeConfig } from "./NFeXmlBuilder";
import { getSefazRejeicaoMessage } from "./sefazRejeicoes";

const SEFAZ_SP = {
  homologacao: {
    autorizacao: "https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx",
    retAutorizacao: "https://homologacao.nfe.fazenda.sp.gov.br/ws/nferetautorizacao4.asmx",
    evento: "https://homologacao.nfe.fazenda.sp.gov.br/ws/nferecepcaoevento4.asmx",
    inutilizacao: "https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeinutilizacao4.asmx",
  },
  producao: {
    autorizacao: "https://nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx",
    retAutorizacao: "https://nfe.fazenda.sp.gov.br/ws/nferetautorizacao4.asmx",
    evento: "https://nfe.fazenda.sp.gov.br/ws/nferecepcaoevento4.asmx",
    inutilizacao: "https://nfe.fazenda.sp.gov.br/ws/nfeinutilizacao4.asmx",
  },
};

export interface SefazAdapterConfig {
  pfxBase64: string;
  pfxPassword: string;
  tpAmb: 1 | 2;
  cUF: string;
  cMunFG: string;
  enderEmit: NFeConfig["enderEmit"];
  // Dados de emissão configuráveis
  finNFe?: string;
  indFinal?: string;
  indPres?: string;
  tpEmis?: string;
  tPag?: string;
  indPag?: string;
}

export class SefazNFeAdapter implements IFiscalAdapter {
  private certManager: CertificateManager;
  private config: SefazAdapterConfig;
  private parser: XMLParser;

  constructor(config: SefazAdapterConfig) {
    this.config = config;
    this.certManager = new CertificateManager();
    this.certManager.load(config.pfxBase64, config.pfxPassword);
    this.parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
  }

  async authorize(input: FiscalAdapterInput): Promise<FiscalAuthorization> {
    const certData = this.certManager.getCertificateData();
    const signer = new XmlSigner(certData);

    const nfeConfig: NFeConfig = {
      tpAmb: this.config.tpAmb,
      cUF: this.config.cUF,
      cMunFG: this.config.cMunFG,
      enderEmit: this.config.enderEmit,
      finNFe: this.config.finNFe,
      indFinal: this.config.indFinal,
      indPres: this.config.indPres,
      tpEmis: this.config.tpEmis,
      tPag: this.config.tPag,
      indPag: this.config.indPag,
    };

    const builder = new NFeXmlBuilder(nfeConfig);
    const { xml: nfeXml, nfeId } = builder.build(input);

    // Assinar NF-e
    const signedXml = signer.signNFe(nfeXml, nfeId);

    // Montar lote (enviNFe)
    const idLote = Date.now().toString().slice(-15);
    const enviNFe = [
      `<enviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">`,
      `<idLote>${idLote}</idLote>`,
      `<indSinc>1</indSinc>`,
      signedXml,
      `</enviNFe>`,
    ].join("");

    // Envelope SOAP
    const soapBody = this.buildSoapEnvelope("nfeAutorizacaoLote", enviNFe);

    // Enviar
    const endpoints = this.config.tpAmb === 2 ? SEFAZ_SP.homologacao : SEFAZ_SP.producao;
    const response = await this.sendSoap(endpoints.autorizacao, soapBody, "nfeAutorizacaoLote");

    // Parsear resposta
    const parsed = this.parser.parse(response);
    const retEnviNFe = this.extractFromSoap(parsed, "retEnviNFe");

    if (!retEnviNFe) {
      throw new Error(`Resposta inesperada da SEFAZ: ${response.substring(0, 500)}`);
    }

    const cStat = String(retEnviNFe.cStat || "");
    const xMotivo = String(retEnviNFe.xMotivo || "");

    // Lote síncrono (indSinc=1): resposta vem em retEnviNFe.protNFe
    const protNFe = retEnviNFe.protNFe as Record<string, unknown> | undefined;
    if (protNFe) {
      const infProt = protNFe.infProt as Record<string, unknown>;
      const protStat = String(infProt.cStat);

      if (protStat === "100") {
        return {
          accessKey: String(infProt.chNFe),
          protocolNumber: String(infProt.nProt),
          xmlContent: signedXml,
          number: input.number,
          series: input.series,
          issueDate: new Date(),
        };
      }
      throw new Error(getSefazRejeicaoMessage(protStat, String(infProt.xMotivo)));
    }

    // Se cStat do lote não é 104 (lote processado), erro
    if (cStat === "104") {
      throw new Error(`Lote processado mas sem protocolo. Motivo: ${xMotivo}`);
    }

    throw new Error(getSefazRejeicaoMessage(cStat, xMotivo));
  }

  async cancel(accessKey: string, reason: string): Promise<FiscalCancellation> {
    const certData = this.certManager.getCertificateData();
    const signer = new XmlSigner(certData);
    const cnpj = certData.cnpj;
    const tpAmb = this.config.tpAmb;
    const nSeqEvento = "1";
    const dhEvento = new Date().toISOString().replace(/\.\d{3}Z/, "-03:00");
    const nProt = accessKey; // Na prática, precisa do número do protocolo de autorização

    const eventId = `ID110111${accessKey}${nSeqEvento.padStart(2, "0")}`;

    const infEvento = [
      `<infEvento Id="${eventId}">`,
      `<cOrgao>${this.config.cUF}</cOrgao>`,
      `<tpAmb>${tpAmb}</tpAmb>`,
      `<CNPJ>${cnpj}</CNPJ>`,
      `<chNFe>${accessKey}</chNFe>`,
      `<dhEvento>${dhEvento}</dhEvento>`,
      `<tpEvento>110111</tpEvento>`,
      `<nSeqEvento>${nSeqEvento}</nSeqEvento>`,
      `<verEvento>1.00</verEvento>`,
      `<detEvento versao="1.00">`,
      `<descEvento>Cancelamento</descEvento>`,
      `<nProt>${nProt}</nProt>`,
      `<xJust>${reason}</xJust>`,
      `</detEvento>`,
      `</infEvento>`,
    ].join("");

    const eventoXml = `<evento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">${infEvento}</evento>`;
    const signedEvento = signer.signEvento(eventoXml, eventId);

    const envEvento = [
      `<envEvento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">`,
      `<idLote>${Date.now()}</idLote>`,
      signedEvento,
      `</envEvento>`,
    ].join("");

    const soapBody = this.buildSoapEnvelope("nfeRecepcaoEvento", envEvento);
    const endpoints = this.config.tpAmb === 2 ? SEFAZ_SP.homologacao : SEFAZ_SP.producao;
    const response = await this.sendSoap(endpoints.evento, soapBody, "nfeRecepcaoEvento");

    const parsed = this.parser.parse(response);
    const retEvento = this.extractFromSoap(parsed, "retEnvEvento");

    if (!retEvento) {
      throw new Error(`Resposta inesperada no cancelamento: ${response.substring(0, 500)}`);
    }

    const infEvResp = (retEvento?.retEvento as Record<string, unknown>)?.infEvento as Record<string, unknown> | undefined;
    if (infEvResp) {
      const cStat = String(infEvResp.cStat);
      if (cStat === "135" || cStat === "155") {
        return {
          protocolNumber: String(infEvResp.nProt || ""),
          xmlContent: signedEvento,
        };
      }
      throw new Error(getSefazRejeicaoMessage(cStat, String(infEvResp.xMotivo)));
    }

    throw new Error(`Erro no cancelamento: ${JSON.stringify(retEvento).substring(0, 300)}`);
  }

  async inutilizar(ano: number, serie: number, numInicio: number, numFim: number, justificativa: string): Promise<{ protocolNumber: string; xmlContent: string }> {
    const certData = this.certManager.getCertificateData();
    const signer = new XmlSigner(certData);
    const cnpj = (certData.cnpj || "").padStart(14, "0");
    const cUF = this.config.cUF;
    const anoStr = String(ano).slice(-2);
    const serieStr = String(serie).padStart(3, "0");
    const nIni = String(numInicio).padStart(9, "0");
    const nFin = String(numFim).padStart(9, "0");
    const inutId = `ID${cUF}${anoStr}${cnpj}55${serieStr}${nIni}${nFin}`;

    const infInut = [
      `<infInut Id="${inutId}">`,
      `<tpAmb>${this.config.tpAmb}</tpAmb>`,
      `<xServ>INUTILIZAR</xServ>`,
      `<cUF>${cUF}</cUF>`,
      `<ano>${anoStr}</ano>`,
      `<CNPJ>${cnpj}</CNPJ>`,
      `<mod>55</mod>`,
      `<serie>${serie}</serie>`,
      `<nNFIni>${numInicio}</nNFIni>`,
      `<nNFFin>${numFim}</nNFFin>`,
      `<xJust>${justificativa}</xJust>`,
      `</infInut>`,
    ].join("");

    const inutNFe = `<inutNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">${infInut}</inutNFe>`;
    const signedXml = signer.signInut(inutNFe, inutId);

    const soapBody = this.buildSoapEnvelope("nfeInutilizacaoNF", signedXml);
    const endpoints = this.config.tpAmb === 2 ? SEFAZ_SP.homologacao : SEFAZ_SP.producao;
    const response = await this.sendSoap(endpoints.inutilizacao, soapBody, "nfeInutilizacaoNF");

    const parsed = this.parser.parse(response);
    const retInutNFe = this.extractFromSoap(parsed, "retInutNFe");

    if (!retInutNFe) {
      throw new Error(`Resposta inesperada da SEFAZ (inutilização): ${response.substring(0, 500)}`);
    }

    const infInutResp = retInutNFe.infInut as Record<string, unknown> | undefined;
    if (infInutResp) {
      const cStat = String(infInutResp.cStat);
      if (cStat === "102") {
        return {
          protocolNumber: String(infInutResp.nProt || ""),
          xmlContent: signedXml,
        };
      }
      throw new Error(getSefazRejeicaoMessage(cStat, String(infInutResp.xMotivo)));
    }

    throw new Error(`Erro na inutilização: ${JSON.stringify(retInutNFe).substring(0, 300)}`);
  }

  private buildSoapEnvelope(action: string, content: string): string {
    return [
      `<?xml version="1.0" encoding="utf-8"?>`,
      `<soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">`,
      `<soap12:Body>`,
      `<nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4">`,
      content,
      `</nfeDadosMsg>`,
      `</soap12:Body>`,
      `</soap12:Envelope>`,
    ].join("");
  }

  private sendSoap(url: string, body: string, action: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const pfxBuffer = this.certManager.getPfxBuffer(this.config.pfxBase64);
      const urlObj = new URL(url);

      const options: https.RequestOptions = {
        hostname: urlObj.hostname,
        port: 443,
        path: urlObj.pathname,
        method: "POST",
        headers: {
          "Content-Type": "application/soap+xml; charset=utf-8",
          "Content-Length": Buffer.byteLength(body, "utf8"),
          SOAPAction: action,
        },
        pfx: pfxBuffer,
        passphrase: this.config.pfxPassword,
        rejectUnauthorized: false, // SEFAZ usa cadeia ICP-Brasil não presente no Node.js por padrão
      };

      const req = https.request(options, (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const responseBody = Buffer.concat(chunks).toString("utf8");
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(responseBody);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${responseBody.substring(0, 500)}`));
          }
        });
      });

      req.on("error", (err) => reject(new Error(`Erro de conexão com SEFAZ: ${err.message}`)));
      req.setTimeout(30000, () => { req.destroy(); reject(new Error("Timeout na comunicação com SEFAZ (30s)")); });
      req.write(body, "utf8");
      req.end();
    });
  }

  private extractFromSoap(parsed: Record<string, unknown>, tagName: string): Record<string, unknown> | null {
    // Navega pela estrutura SOAP para encontrar a tag de resposta
    const envelope = parsed["soap:Envelope"] || parsed["soap12:Envelope"] || parsed["soapenv:Envelope"];
    if (!envelope) {
      // Tentar sem namespace
      return this.deepFind(parsed, tagName);
    }
    const body = (envelope as Record<string, unknown>)["soap:Body"] || (envelope as Record<string, unknown>)["soap12:Body"] || (envelope as Record<string, unknown>)["soapenv:Body"];
    if (!body) return this.deepFind(parsed, tagName);
    return this.deepFind(body as Record<string, unknown>, tagName);
  }

  private deepFind(obj: unknown, key: string): Record<string, unknown> | null {
    if (!obj || typeof obj !== "object") return null;
    const record = obj as Record<string, unknown>;
    if (key in record) return record[key] as Record<string, unknown>;
    for (const v of Object.values(record)) {
      const found = this.deepFind(v, key);
      if (found) return found;
    }
    return null;
  }
}
