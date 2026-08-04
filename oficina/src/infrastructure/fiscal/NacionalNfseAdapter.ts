import * as https from "https";
import * as zlib from "zlib";
import { SignedXml } from "xml-crypto";
import { IFiscalAdapter, FiscalAdapterInput, FiscalAuthorization, FiscalCancellation } from "./IFiscalAdapter";
import { CertificateManager } from "./CertificateManager";

export interface NacionalNfseConfig {
  pfxBase64: string;
  pfxPassword: string;
  cnpj: string;
  inscricaoMunicipal: string;
  razaoSocial: string;
  cityCode: string;           // Código IBGE 7 dígitos
  codigoServico: string;      // Código Tributação Nacional (ex: "14.01" ou "1401")
  aliquotaISS: number;        // % ISS
  serie: string;              // Série da DPS
  environment: "homologation" | "production";
  descricaoServico?: string;
}

const ENDPOINTS = {
  homologation: "https://sefin.producaorestrita.nfse.gov.br/SefinNacional",
  production: "https://sefin.nfse.gov.br/SefinNacional",
};

/**
 * Adapter NFS-e Padrão Nacional (SEFIN Nacional / ADN).
 * Obrigatório em todo o Brasil desde 01/01/2026 (LC 214/2025).
 *
 * Protocolo: REST + JSON com XML gzip+base64.
 * Autenticação: mTLS com certificado digital A1 (e-CNPJ).
 */
export class NacionalNfseAdapter implements IFiscalAdapter {
  private baseUrl: string;
  private certManager: CertificateManager;
  private config: NacionalNfseConfig;

  constructor(config: NacionalNfseConfig) {
    this.config = config;
    this.baseUrl = ENDPOINTS[config.environment];
    this.certManager = new CertificateManager();
    this.certManager.load(config.pfxBase64, config.pfxPassword);
  }

  async authorize(input: FiscalAdapterInput): Promise<FiscalAuthorization> {
    // 1. Montar XML da DPS
    const dpsXml = this.buildDpsXml(input);

    // 2. Assinar XML (XMLDSig RSA-SHA256 sobre infDPS)
    const signedXml = this.signXml(dpsXml, "infDPS", "DPS");

    // 3. Gzip + Base64
    const gzipped = zlib.gzipSync(Buffer.from(signedXml, "utf-8"));
    const b64 = gzipped.toString("base64");

    // 4. Enviar para SEFIN Nacional
    const body = JSON.stringify({ dpsXmlGZipB64: b64 });
    const response = await this.request("POST", "/nfse", body);

    // 5. Processar resposta
    if (response.erros && Array.isArray(response.erros) && response.erros.length > 0) {
      const errorMessages = (response.erros as Array<{ codigo: string; descricao: string }>)
        .map((e) => `[${e.codigo}] ${e.descricao}`)
        .join("; ");
      throw new Error(`NFS-e Nacional rejeitada: ${errorMessages}`);
    }

    if (!response.chaveAcesso) {
      throw new Error("Resposta inesperada do SEFIN Nacional: chave de acesso não retornada");
    }

    // Decodificar XML da NFS-e autorizada
    let nfseXml = "";
    if (response.nfseXmlGZipB64) {
      const nfseGzip = Buffer.from(response.nfseXmlGZipB64 as string, "base64");
      nfseXml = zlib.gunzipSync(nfseGzip).toString("utf-8");
    }

    return {
      accessKey: response.chaveAcesso as string,
      protocolNumber: (response.nProt || response.chaveAcesso) as string,
      xmlContent: nfseXml || signedXml,
      number: input.number,
      series: input.series,
      issueDate: new Date(),
    };
  }

  async cancel(accessKey: string, reason: string): Promise<FiscalCancellation> {
    // 1. Montar XML de evento de cancelamento
    const eventoXml = this.buildCancelEventXml(accessKey, reason);

    // 2. Assinar XML (XMLDSig RSA-SHA256 sobre infPedReg)
    const signedXml = this.signXml(eventoXml, "infPedReg", "pedRegEvento");

    // 3. Gzip + Base64
    const gzipped = zlib.gzipSync(Buffer.from(signedXml, "utf-8"));
    const b64 = gzipped.toString("base64");

    // 4. Enviar evento
    const body = JSON.stringify({ pedRegEvtXmlGZipB64: b64 });
    const response = await this.request("POST", `/nfse/${accessKey}/eventos`, body);

    if (response.erros && Array.isArray(response.erros) && response.erros.length > 0) {
      const errorMessages = (response.erros as Array<{ codigo: string; descricao: string }>)
        .map((e) => `[${e.codigo}] ${e.descricao}`)
        .join("; ");
      throw new Error(`Cancelamento rejeitado: ${errorMessages}`);
    }

    // Decodificar XML do evento autorizado
    let evtXml = "";
    if (response.evtXmlGZipB64) {
      const evtGzip = Buffer.from(response.evtXmlGZipB64 as string, "base64");
      evtXml = zlib.gunzipSync(evtGzip).toString("utf-8");
    }

    return {
      protocolNumber: (response.nProt || accessKey) as string,
      xmlContent: evtXml || signedXml,
    };
  }

  // ============================================
  // XML Signature (SHA-256 — padrão NFS-e Nacional)
  // ============================================

  private signXml(xml: string, refTagName: string, parentTagName: string): string {
    const certData = this.certManager.getCertificateData();

    const sig = new SignedXml({
      privateKey: certData.privateKeyPem,
      publicCert: certData.certificatePem,
      canonicalizationAlgorithm: "http://www.w3.org/TR/2001/REC-xml-c14n-20010315",
      signatureAlgorithm: "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256",
    });

    // Extrair o Id do elemento referenciado
    const idMatch = xml.match(new RegExp(`<${refTagName}[^>]*Id="([^"]+)"`));
    const refId = idMatch ? idMatch[1] : "";

    sig.addReference({
      xpath: `//*[local-name()='${refTagName}']`,
      uri: `#${refId}`,
      digestAlgorithm: "http://www.w3.org/2001/04/xmlenc#sha256",
      transforms: [
        "http://www.w3.org/2000/09/xmldsig#enveloped-signature",
        "http://www.w3.org/TR/2001/REC-xml-c14n-20010315",
      ],
    });

    sig.computeSignature(xml, {
      location: { reference: `//*[local-name()='${parentTagName}']`, action: "append" },
    });

    return sig.getSignedXml();
  }

  // ============================================
  // XML Builders
  // ============================================

  private buildDpsXml(input: FiscalAdapterInput): string {
    const now = new Date();
    const dhEmi = now.toISOString().replace("Z", "-03:00");
    const dCompet = now.toISOString().split("T")[0];
    const tpAmb = this.config.environment === "production" ? "1" : "2";
    const cnpjLimpo = this.config.cnpj.replace(/\D/g, "");
    const serie = this.config.serie || "1";
    const nDPS = String(input.number);

    // Gerar ID: DPS + CNPJ(14) + cLocEmi(7) + serie(5) + nDPS(15)
    const idDPS = `DPS${cnpjLimpo}${this.config.cityCode}${serie.padStart(5, "0")}${nDPS.padStart(15, "0")}`;

    // Código de tributação nacional (formatar como XX.XX se vier XXXX)
    let cTribNac = this.config.codigoServico || "14.01";
    if (cTribNac.length === 4 && !cTribNac.includes(".")) {
      cTribNac = `${cTribNac.substring(0, 2)}.${cTribNac.substring(2)}`;
    }

    // Descrição do serviço
    const descServico = this.config.descricaoServico
      || input.items.map((i) => i.description).join("; ")
      || "Serviços de manutenção e reparação de veículos automotores";

    // Valor total dos serviços
    const vServ = input.totalAmount.toFixed(2);

    // Tomador (dados do cliente da OS)
    const tomadorCpfCnpj = input.items[0]?.ncm || ""; // Hack temporário — ver abaixo
    // Na prática, o FiscalProcessor passa os dados do tomador via input
    // Mas a interface atual não tem campo dedicado. Usamos os campos disponíveis.

    let tomadorBlock = "";
    if (input.cnpj) {
      // O cnpj no input é do prestador, mas podemos ter tomadorEmail
      tomadorBlock = `<toma><CNPJ>00000000000000</CNPJ><xNome>CONSUMIDOR</xNome></toma>`;
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<DPS xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.00">
  <infDPS Id="${idDPS}">
    <tpAmb>${tpAmb}</tpAmb>
    <dhEmi>${dhEmi}</dhEmi>
    <verAplic>Operare_1.0</verAplic>
    <serie>${serie}</serie>
    <nDPS>${nDPS}</nDPS>
    <dCompet>${dCompet}</dCompet>
    <tpEmit>1</tpEmit>
    <cLocEmi>${this.config.cityCode}</cLocEmi>
    <prest>
      <CNPJ>${cnpjLimpo}</CNPJ>
    </prest>
    ${tomadorBlock}
    <serv>
      <locPrest>
        <cLocPrestacao>${this.config.cityCode}</cLocPrestacao>
      </locPrest>
      <cServ>
        <cTribNac>${cTribNac}</cTribNac>
        <xDescServ>${this.escapeXml(descServico)}</xDescServ>
      </cServ>
    </serv>
    <valores>
      <vServPrest>
        <vServ>${vServ}</vServ>
      </vServPrest>
      <trib>
        <tribMun>
          <tribISSQN>1</tribISSQN>
          <tpRetISSQN>2</tpRetISSQN>
          <pAliq>${this.config.aliquotaISS.toFixed(2)}</pAliq>
        </tribMun>
        <totTrib>
          <indTotTrib>0</indTotTrib>
        </totTrib>
      </trib>
    </valores>
  </infDPS>
</DPS>`;

    return xml;
  }

  private buildCancelEventXml(chaveNFSe: string, motivo: string): string {
    const now = new Date();
    const dhEvento = now.toISOString().replace("Z", "-03:00");
    const tpAmb = this.config.environment === "production" ? "1" : "2";
    const cnpjLimpo = this.config.cnpj.replace(/\D/g, "");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<pedRegEvento xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.00">
  <infPedReg Id="ECANC${chaveNFSe}">
    <tpAmb>${tpAmb}</tpAmb>
    <verAplic>Operare_1.0</verAplic>
    <dhEvento>${dhEvento}</dhEvento>
    <cnpjAutor>${cnpjLimpo}</cnpjAutor>
    <chNFSe>${chaveNFSe}</chNFSe>
    <e101101>
      <cMotivo>1</cMotivo>
      <xMotivo>${this.escapeXml(motivo)}</xMotivo>
    </e101101>
  </infPedReg>
</pedRegEvento>`;

    return xml;
  }

  // ============================================
  // HTTP Client (mTLS)
  // ============================================

  private request(method: string, path: string, body: string): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      const pfxBuffer = this.certManager.getPfxBuffer(this.config.pfxBase64);
      const url = new URL(this.baseUrl + path);

      const options: https.RequestOptions = {
        hostname: url.hostname,
        port: 443,
        path: url.pathname + url.search,
        method,
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
        pfx: pfxBuffer,
        passphrase: this.config.pfxPassword,
        rejectUnauthorized: true,
      };

      const req = https.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => { data += chunk; });
        res.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            if (res.statusCode && res.statusCode >= 400) {
              // API retornou erro HTTP
              if (parsed.erros) {
                resolve(parsed); // Deixa o caller tratar os erros
              } else {
                reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 200)}`));
              }
            } else {
              resolve(parsed);
            }
          } catch {
            reject(new Error(`Resposta inválida do SEFIN Nacional (HTTP ${res.statusCode}): ${data.substring(0, 200)}`));
          }
        });
      });

      req.on("error", (err) => {
        if (err.message.includes("certificate")) {
          reject(new Error(`Erro de certificado digital na comunicação com SEFIN Nacional: ${err.message}`));
        } else if (err.message.includes("ECONNREFUSED") || err.message.includes("ETIMEDOUT")) {
          reject(new Error("SEFIN Nacional indisponível. Tente novamente em alguns minutos."));
        } else {
          reject(new Error(`Erro de comunicação com SEFIN Nacional: ${err.message}`));
        }
      });

      req.setTimeout(30000, () => {
        req.destroy();
        reject(new Error("Timeout na comunicação com SEFIN Nacional (30s). Tente novamente."));
      });

      req.write(body);
      req.end();
    });
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }
}
