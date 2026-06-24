import * as https from "https";
import * as zlib from "zlib";
import { SignedXml } from "xml-crypto";
import { XMLParser } from "fast-xml-parser";
import { IFiscalAdapter, FiscalAdapterInput, FiscalAuthorization, FiscalCancellation } from "./IFiscalAdapter";
import { CertificateManager, CertificateData } from "./CertificateManager";

/**
 * Configuração para o adapter NFS-e Nacional (SEFIN/ADN).
 */
export interface NFSeNacionalConfig {
  pfxBase64: string;
  pfxPassword: string;
  cnpj: string;
  inscricaoMunicipal: string;
  razaoSocial: string;
  cLocEmi: string;   // Código IBGE do município emissor (7 dígitos) ex: "3552205"
  cTribNac: string;  // Código tributação nacional (ex: "01.02.07.00" → manutenção)
  cTribMun: string;  // Código tributação municipal (ex: "7102")
  production?: boolean;
}

const ENDPOINTS = {
  production: "https://sefin.nfse.gov.br/SefinNacional/nfse",
  homologation: "https://sefin.producaorestrita.nfse.gov.br/SefinNacional/nfse",
};

/**
 * Adapter NFS-e padrão nacional (SEFIN Nacional).
 * API REST com DPS assinado em XML, gzip+base64, JSON body.
 * Funciona para qualquer município conveniado (incluindo Sorocaba).
 */
export class NFSeNacionalAdapter implements IFiscalAdapter {
  private certManager: CertificateManager;
  private config: NFSeNacionalConfig;
  private parser: XMLParser;

  constructor(config: NFSeNacionalConfig) {
    this.config = config;
    this.certManager = new CertificateManager();
    this.certManager.load(config.pfxBase64, config.pfxPassword);
    this.parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
  }

  async authorize(input: FiscalAdapterInput): Promise<FiscalAuthorization> {
    const certData = this.certManager.getCertificateData();
    const tpAmb = this.config.production ? "1" : "2";

    // Montar DPS XML
    const dpsXml = this.buildDpsXml(input, tpAmb);

    // Assinar infDPS
    const signedXml = this.signDps(dpsXml, certData);

    // Gzip + base64
    const gzipped = zlib.gzipSync(Buffer.from(signedXml, "utf8"), { level: 9 });
    const base64Payload = gzipped.toString("base64");

    // Enviar POST
    const endpoint = this.config.production ? ENDPOINTS.production : ENDPOINTS.homologation;
    const body = JSON.stringify({ dpsXmlGZipB64: base64Payload });

    const response = await this.sendRequest("POST", endpoint, body, certData);
    const parsed = JSON.parse(response);

    // Verificar sucesso
    if (parsed.chaveAcesso || parsed.chNFSe) {
      const chave = parsed.chaveAcesso || parsed.chNFSe;
      return {
        accessKey: chave,
        protocolNumber: chave,
        xmlContent: signedXml,
        number: input.number,
        series: input.series,
        issueDate: new Date(),
      };
    }

    // Erro
    const erros = parsed.erros || parsed.erro;
    const mensagem = this.extractErros(erros);
    throw new Error(`Rejeição NFS-e Nacional: ${mensagem}`);
  }

  async cancel(accessKey: string, reason: string): Promise<FiscalCancellation> {
    const certData = this.certManager.getCertificateData();
    const tpAmb = this.config.production ? "1" : "2";

    // Montar evento de cancelamento
    const eventoXml = this.buildCancelamentoXml(accessKey, reason, tpAmb);
    const signedXml = this.signEvento(eventoXml, certData);

    // Gzip + base64
    const gzipped = zlib.gzipSync(Buffer.from(signedXml, "utf8"), { level: 9 });
    const base64Payload = gzipped.toString("base64");

    // Enviar POST para /{chave}/eventos
    const endpoint = this.config.production ? ENDPOINTS.production : ENDPOINTS.homologation;
    const url = `${endpoint}/${accessKey}/eventos`;
    const body = JSON.stringify({ pedidoRegistroEventoXmlGZipB64: base64Payload });

    const response = await this.sendRequest("POST", url, body, certData);
    const parsed = JSON.parse(response);

    if (parsed.chaveAcesso || parsed.chNFSe || !parsed.erros) {
      return { protocolNumber: accessKey, xmlContent: signedXml };
    }

    const mensagem = this.extractErros(parsed.erros || parsed.erro);
    throw new Error(`Erro cancelamento NFS-e: ${mensagem}`);
  }

  private buildDpsXml(input: FiscalAdapterInput, tpAmb: string): string {
    const now = new Date();
    const dhEmi = now.toISOString().replace(/\.\d{3}Z/, "-03:00");
    const dCompet = now.toISOString().split("T")[0];
    const cnpj = this.config.cnpj.replace(/\D/g, "");
    const serie = String(input.series).padStart(5, "0");
    const nDPS = String(input.number).padStart(15, "0");
    const dpsId = `DPS${this.config.cLocEmi.padStart(7, "0")}2${cnpj.padStart(14, "0")}${serie}${nDPS}`;

    const cpfCnpjTomador = (input.cnpj || "").replace(/\D/g, "");
    const tomadorTag = cpfCnpjTomador.length === 11
      ? `<CPF>${cpfCnpjTomador}</CPF>`
      : `<CNPJ>${cpfCnpjTomador}</CNPJ>`;

    const descricao = input.items.map((i) => `${i.description} (${i.quantity}x)`).join("; ");
    const vServ = input.totalAmount.toFixed(2);

    return [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<DPS xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.01">`,
      `<infDPS Id="${dpsId}">`,
      `<tpAmb>${tpAmb}</tpAmb>`,
      `<dhEmi>${dhEmi}</dhEmi>`,
      `<verAplic>OPERARE1.0</verAplic>`,
      `<serie>${String(input.series)}</serie>`,
      `<nDPS>${String(input.number)}</nDPS>`,
      `<dCompet>${dCompet}</dCompet>`,
      `<tpEmit>1</tpEmit>`,
      `<cLocEmi>${this.config.cLocEmi}</cLocEmi>`,
      `<prest>`,
      `<CNPJ>${cnpj}</CNPJ>`,
      `<IM>${this.config.inscricaoMunicipal}</IM>`,
      `<xNome>${this.escapeXml(this.config.razaoSocial)}</xNome>`,
      `<regTrib>`,
      `<opSimpNac>1</opSimpNac>`,
      `<regEspTrib>0</regEspTrib>`,
      `</regTrib>`,
      `</prest>`,
      `<toma>`,
      tomadorTag,
      `<xNome>${this.escapeXml(input.razaoSocial)}</xNome>`,
      `</toma>`,
      `<serv>`,
      `<locPrest>`,
      `<cLocPrestacao>${this.config.cLocEmi}</cLocPrestacao>`,
      `</locPrest>`,
      `<cServ>`,
      `<cTribNac>${this.config.cTribNac}</cTribNac>`,
      `<cTribMun>${this.config.cTribMun}</cTribMun>`,
      `<xDescServ>${this.escapeXml(descricao)}</xDescServ>`,
      `<cNBS>1.0101</cNBS>`,
      `</cServ>`,
      `</serv>`,
      `<valores>`,
      `<vServPrest>`,
      `<vServ>${vServ}</vServ>`,
      `</vServPrest>`,
      `<trib>`,
      `<tribMun>`,
      `<tribISSQN>1</tribISSQN>`,
      `<tpRetISSQN>1</tpRetISSQN>`,
      `</tribMun>`,
      `<totTrib>`,
      `<vTotTrib>`,
      `<vTotTribFed>0.00</vTotTribFed>`,
      `<vTotTribEst>0.00</vTotTribEst>`,
      `<vTotTribMun>0.00</vTotTribMun>`,
      `</vTotTrib>`,
      `</totTrib>`,
      `</trib>`,
      `</valores>`,
      `</infDPS>`,
      `</DPS>`,
    ].join("");
  }

  private buildCancelamentoXml(chNFSe: string, motivo: string, tpAmb: string): string {
    const tipoEvento = "101101";
    const idPedReg = `PRE${chNFSe}${tipoEvento}`;
    const dhEvento = new Date().toISOString().replace(/\.\d{3}Z/, "-03:00");
    const cnpj = this.config.cnpj.replace(/\D/g, "");

    return [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<pedRegEvento xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.01">`,
      `<infPedReg Id="${idPedReg}">`,
      `<tpAmb>${tpAmb}</tpAmb>`,
      `<verAplic>OPERARE1.0</verAplic>`,
      `<dhEvento>${dhEvento}</dhEvento>`,
      `<CNPJAutor>${cnpj}</CNPJAutor>`,
      `<chNFSe>${chNFSe}</chNFSe>`,
      `<e101101>`,
      `<xDesc>Cancelamento de NFS-e</xDesc>`,
      `<cMotivo>2</cMotivo>`,
      `<xMotivo>${this.escapeXml(motivo)}</xMotivo>`,
      `</e101101>`,
      `</infPedReg>`,
      `</pedRegEvento>`,
    ].join("");
  }

  private signDps(xml: string, certData: CertificateData): string {
    const sig = new SignedXml({
      privateKey: certData.privateKeyPem,
      publicCert: certData.certificatePem,
      canonicalizationAlgorithm: "http://www.w3.org/TR/2001/REC-xml-c14n-20010315",
      signatureAlgorithm: "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256",
    });

    sig.addReference({
      xpath: `//*[local-name()='infDPS']`,
      uri: "",
      digestAlgorithm: "http://www.w3.org/2001/04/xmlenc#sha256",
      transforms: [
        "http://www.w3.org/2000/09/xmldsig#enveloped-signature",
        "http://www.w3.org/TR/2001/REC-xml-c14n-20010315",
      ],
    });

    sig.computeSignature(xml, {
      location: { reference: `//*[local-name()='DPS']`, action: "append" },
    });

    return sig.getSignedXml();
  }

  private signEvento(xml: string, certData: CertificateData): string {
    const sig = new SignedXml({
      privateKey: certData.privateKeyPem,
      publicCert: certData.certificatePem,
      canonicalizationAlgorithm: "http://www.w3.org/TR/2001/REC-xml-c14n-20010315",
      signatureAlgorithm: "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256",
    });

    sig.addReference({
      xpath: `//*[local-name()='infPedReg']`,
      uri: "",
      digestAlgorithm: "http://www.w3.org/2001/04/xmlenc#sha256",
      transforms: [
        "http://www.w3.org/2000/09/xmldsig#enveloped-signature",
        "http://www.w3.org/TR/2001/REC-xml-c14n-20010315",
      ],
    });

    sig.computeSignature(xml, {
      location: { reference: `//*[local-name()='pedRegEvento']`, action: "append" },
    });

    return sig.getSignedXml();
  }

  private sendRequest(method: string, url: string, body: string, certData: CertificateData): Promise<string> {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const options: https.RequestOptions = {
        hostname: urlObj.hostname,
        port: 443,
        path: urlObj.pathname + urlObj.search,
        method,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body, "utf8"),
        },
        key: certData.privateKeyPem,
        cert: certData.certificatePem,
        rejectUnauthorized: false,
      };

      const req = https.request(options, (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const responseBody = Buffer.concat(chunks).toString("utf8");
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(responseBody);
          } else if (res.statusCode === 422 || res.statusCode === 400) {
            // Erros de validação — retorna o body para parse
            resolve(responseBody);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${responseBody.substring(0, 500)}`));
          }
        });
      });

      req.on("error", (err) => reject(new Error(`Erro de conexão com SEFIN Nacional: ${err.message}`)));
      req.setTimeout(30000, () => { req.destroy(); reject(new Error("Timeout na comunicação com SEFIN Nacional (30s)")); });
      req.write(body, "utf8");
      req.end();
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private extractErros(erros: any): string {
    if (!erros) return "Erro desconhecido";
    if (Array.isArray(erros)) {
      return erros.map((e) => e.descricao || e.Descricao || e.mensagem || JSON.stringify(e)).join("; ");
    }
    return erros.descricao || erros.Descricao || erros.mensagem || JSON.stringify(erros);
  }

  private escapeXml(str: string): string {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
}
