import * as https from "https";
import * as crypto from "crypto";
import { XMLParser } from "fast-xml-parser";
import { SignedXml } from "xml-crypto";
import { IFiscalAdapter, FiscalAdapterInput, FiscalAuthorization, FiscalCancellation } from "./IFiscalAdapter";
import { CertificateManager, CertificateData } from "./CertificateManager";

/**
 * Configuração NFS-e Sorocaba (sistema DSF).
 */
export interface SorocabaNFSeConfig {
  pfxBase64: string;
  pfxPassword: string;
  cnpj: string;
  inscricaoMunicipal: string;
  razaoSocial: string;
  codigoServico: string;   // ex: "1401" (LC 116 item 14.01)
  aliquotaISS: number;     // ex: 2.01
  serie: string;           // ex: "U"
  // Credenciais webservice (pode não ser necessário para Sorocaba)
  wsUsuario?: string;
  wsSenha?: string;
}

const DSF_SOROCABA = {
  url: "https://www.issdigitalsod.com.br/WsNFe2/LoteRps.jws",
  siaf: "7145",
  version: "1",
  soapns: "http://proces.wsnfe2.dsfnet.com.br",
  municipio: "3552205",
};

/**
 * Adapter NFS-e DSF para Sorocaba.
 * Padrão DSF com assinatura XMLDSig + hash SHA-1 no RPS.
 * Requer certificado digital A1 cadastrado na prefeitura.
 */
export class SorocabaNFSeAdapter implements IFiscalAdapter {
  private certManager: CertificateManager;
  private config: SorocabaNFSeConfig;
  private parser: XMLParser;

  constructor(config: SorocabaNFSeConfig) {
    this.config = config;
    this.certManager = new CertificateManager();
    this.certManager.load(config.pfxBase64, config.pfxPassword);
    this.parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
  }

  async authorize(input: FiscalAdapterInput): Promise<FiscalAuthorization> {
    const certData = this.certManager.getCertificateData();
    const dtEmissao = new Date().toISOString().split("T")[0];
    const valorTotal = input.items.reduce((sum, i) => sum + i.totalPrice, 0);

    // Montar RPS
    const rpsXml = this.buildRps(input, dtEmissao, valorTotal);

    // Montar lote envio síncrono
    const loteXml = this.buildLoteEnvio(rpsXml, dtEmissao, valorTotal);

    // Assinar Lote
    const signedXml = this.signLote(loteXml, certData);

    // Enviar via SOAP
    const response = await this.sendSoap(signedXml, "enviarSincrono", certData);

    // Parsear resposta
    const parsed = this.parser.parse(response);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const retorno = this.findTag(parsed, "RetornoEnvioLoteRPS") as any;

    if (!retorno) {
      throw new Error(`Resposta inesperada da Prefeitura: ${response.substring(0, 500)}`);
    }

    if (retorno.Sucesso === "true" || retorno.Sucesso === true) {
      const nota = retorno.ChaveNFeRPS?.ChaveNFe || retorno.ListaNFSe?.ConsultaNFSe;
      const numNota = nota?.NumeroNFe || nota?.NumeroNota || input.number;
      const codVerif = nota?.CodigoVerificacao || "";
      return {
        accessKey: `${numNota}-${codVerif}`,
        protocolNumber: String(codVerif),
        xmlContent: signedXml,
        number: Number(numNota),
        series: input.series,
        issueDate: new Date(),
      };
    }

    const erros = retorno.Erros?.Erro;
    const msg = Array.isArray(erros)
      ? erros.map((e: { Descricao?: string }) => e.Descricao).join("; ")
      : erros?.Descricao || JSON.stringify(retorno).substring(0, 300);
    throw new Error(`Rejeição NFS-e Sorocaba: ${msg}`);
  }

  async cancel(accessKey: string, reason: string): Promise<FiscalCancellation> {
    const certData = this.certManager.getCertificateData();
    const [numero, codigoVerificacao] = accessKey.split("-");

    const xml = [
      `<ns1:ReqCancelamentoNFSe xmlns:ns1="http://localhost:8080/WsNFe2/lote" xmlns:tipos="http://localhost:8080/WsNFe2/tp" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">`,
      `<Cabecalho>`,
      `<CodCidade>${DSF_SOROCABA.siaf}</CodCidade>`,
      `<CPFCNPJRemetente>${this.config.cnpj}</CPFCNPJRemetente>`,
      `<transacao>true</transacao>`,
      `<Versao>${DSF_SOROCABA.version}</Versao>`,
      `</Cabecalho>`,
      `<Lote Id="lote:1">`,
      `<Nota>`,
      `<InscricaoMunicipalPrestador>${this.config.inscricaoMunicipal}</InscricaoMunicipalPrestador>`,
      `<NumeroNota>${numero}</NumeroNota>`,
      `<CodigoVerificacao>${codigoVerificacao}</CodigoVerificacao>`,
      `<MotivoCancelamento>${this.escapeXml(reason)}</MotivoCancelamento>`,
      `</Nota>`,
      `</Lote>`,
      `</ns1:ReqCancelamentoNFSe>`,
    ].join("");

    const signedXml = this.signLote(xml, certData);
    const response = await this.sendSoap(signedXml, "cancelar", certData);
    const parsed = this.parser.parse(response);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const retorno = this.findTag(parsed, "RetornoCancelamentoNFSe") as any;

    if (retorno?.Sucesso === "true" || retorno?.Sucesso === true) {
      return { protocolNumber: codigoVerificacao || "", xmlContent: signedXml };
    }

    const erros = retorno?.Erros?.Erro;
    const msg = Array.isArray(erros)
      ? erros.map((e: { Descricao?: string }) => e.Descricao).join("; ")
      : erros?.Descricao || "Erro desconhecido no cancelamento";
    throw new Error(`Erro cancelamento NFS-e: ${msg}`);
  }

  private buildLoteEnvio(rpsXml: string, dtEmissao: string, valorTotal: number): string {
    return [
      `<ns1:ReqEnvioLoteRPS xmlns:ns1="http://localhost:8080/WsNFe2/lote" xmlns:tipos="http://localhost:8080/WsNFe2/tp" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://localhost:8080/WsNFe2/lote http://localhost:8080/WsNFe2/xsd/ReqEnvioLoteRPS.xsd">`,
      `<Cabecalho>`,
      `<CodCidade>${DSF_SOROCABA.siaf}</CodCidade>`,
      `<CPFCNPJRemetente>${this.config.cnpj}</CPFCNPJRemetente>`,
      `<RazaoSocialRemetente>${this.escapeXml(this.config.razaoSocial)}</RazaoSocialRemetente>`,
      `<transacao>true</transacao>`,
      `<dtInicio>${dtEmissao}</dtInicio>`,
      `<dtFim>${dtEmissao}</dtFim>`,
      `<QtdRPS>1</QtdRPS>`,
      `<ValorTotalServicos>${valorTotal.toFixed(2)}</ValorTotalServicos>`,
      `<ValorTotalDeducoes>0.00</ValorTotalDeducoes>`,
      `<Versao>${DSF_SOROCABA.version}</Versao>`,
      `<MetodoEnvio>WS</MetodoEnvio>`,
      `</Cabecalho>`,
      `<Lote Id="lote:1">`,
      rpsXml,
      `</Lote>`,
      `</ns1:ReqEnvioLoteRPS>`,
    ].join("");
  }

  private buildRps(input: FiscalAdapterInput, dtEmissao: string, valorTotal: number): string {
    const hashStr = this.buildRpsHash(input, dtEmissao, valorTotal);
    const descricao = input.items.map((i) => `${i.description} (${i.quantity}x)`).join("; ");
    const cpfCnpjTomador = (input.cnpj || "").replace(/\D/g, "").padStart(14, "0");
    const aliquota = (this.config.aliquotaISS / 100).toFixed(4); // 2.01 → 0.0201

    const itensXml = input.items.map((item) => [
      `<Item>`,
      `<DiscriminacaoServico>${this.escapeXml(item.description)}</DiscriminacaoServico>`,
      `<Quantidade>${item.quantity.toFixed(2)}</Quantidade>`,
      `<ValorUnitario>${item.unitPrice.toFixed(4)}</ValorUnitario>`,
      `<ValorTotal>${item.totalPrice.toFixed(2)}</ValorTotal>`,
      `<Tributavel>S</Tributavel>`,
      `</Item>`,
    ].join("")).join("");

    return [
      `<RPS Id="rps:${input.number}">`,
      `<Assinatura>${hashStr}</Assinatura>`,
      `<InscricaoMunicipalPrestador>${this.config.inscricaoMunicipal}</InscricaoMunicipalPrestador>`,
      `<RazaoSocialPrestador>${this.escapeXml(this.config.razaoSocial)}</RazaoSocialPrestador>`,
      `<TipoRPS>RPS</TipoRPS>`,
      `<SerieRPS>${this.config.serie}</SerieRPS>`,
      `<NumeroRPS>${input.number}</NumeroRPS>`,
      `<DataEmissaoRPS>${dtEmissao}</DataEmissaoRPS>`,
      `<SituacaoRPS>N</SituacaoRPS>`,
      `<SeriePrestacao>99</SeriePrestacao>`,
      `<CPFCNPJTomador>${cpfCnpjTomador}</CPFCNPJTomador>`,
      `<RazaoSocialTomador>${this.escapeXml(input.razaoSocial)}</RazaoSocialTomador>`,
      `<TipoLogradouroTomador></TipoLogradouroTomador>`,
      `<LogradouroTomador></LogradouroTomador>`,
      `<NumeroEnderecoTomador></NumeroEnderecoTomador>`,
      `<TipoBairroTomador></TipoBairroTomador>`,
      `<BairroTomador></BairroTomador>`,
      `<CidadeTomador>${DSF_SOROCABA.municipio}</CidadeTomador>`,
      `<CidadeTomadorDescricao>SOROCABA</CidadeTomadorDescricao>`,
      `<CEPTomador></CEPTomador>`,
      `<EmailTomador></EmailTomador>`,
      `<CodigoAtividade>${this.config.codigoServico}</CodigoAtividade>`,
      `<AliquotaAtividade>${aliquota}</AliquotaAtividade>`,
      `<TipoRecolhimento>A</TipoRecolhimento>`,
      `<MunicipioPrestacao>${DSF_SOROCABA.municipio}</MunicipioPrestacao>`,
      `<MunicipioPrestacaoDescricao>SOROCABA</MunicipioPrestacaoDescricao>`,
      `<Operacao>A</Operacao>`,
      `<Tributacao>H</Tributacao>`,
      `<ValorPIS>0.00</ValorPIS>`,
      `<ValorCOFINS>0.00</ValorCOFINS>`,
      `<ValorINSS>0.00</ValorINSS>`,
      `<ValorIR>0.00</ValorIR>`,
      `<ValorCSLL>0.00</ValorCSLL>`,
      `<AliquotaPIS>0.0000</AliquotaPIS>`,
      `<AliquotaCOFINS>0.0000</AliquotaCOFINS>`,
      `<AliquotaINSS>0.0000</AliquotaINSS>`,
      `<AliquotaIR>0.0000</AliquotaIR>`,
      `<AliquotaCSLL>0.0000</AliquotaCSLL>`,
      `<DescricaoRPS>${this.escapeXml(descricao)}</DescricaoRPS>`,
      `<DDDPrestador></DDDPrestador>`,
      `<TelefonePrestador></TelefonePrestador>`,
      `<DDDTomador></DDDTomador>`,
      `<TelefoneTomador></TelefoneTomador>`,
      `<Itens>`,
      itensXml,
      `</Itens>`,
      `</RPS>`,
    ].join("");
  }

  /**
   * Hash SHA-1 do RPS conforme padrão DSF:
   * IM(11) + Serie(5) + NumeroRPS(12) + DataEmissao(8) + Tributacao(2)
   * + SituacaoRPS(1) + ISSRetido(1) + ValorServicos(15) + ValorDeducoes(15) + CodigoAtividade(10) + CPFCNPJ(14)
   */
  private buildRpsHash(input: FiscalAdapterInput, dtEmissao: string, valorTotal: number): string {
    const im = this.config.inscricaoMunicipal.padStart(11, "0");
    const serie = this.config.serie.padEnd(5, " ");
    const numero = String(input.number).padStart(12, "0");
    const dt = dtEmissao.replace(/-/g, "");
    const tributacao = "H ".substring(0, 2); // H = Simples Nacional, pad to 2
    const situacao = "N";
    const issRetido = "N"; // TipoRecolhimento A → não retido
    const valorServ = String(Math.round(valorTotal * 100)).padStart(15, "0");
    const valorDeduc = "0".padStart(15, "0");
    const codAtividade = this.config.codigoServico.padStart(10, "0");
    const cpfCnpj = (input.cnpj || "").replace(/\D/g, "").padStart(14, "0");

    const content = `${im}${serie}${numero}${dt}${tributacao}${situacao}${issRetido}${valorServ}${valorDeduc}${codAtividade}${cpfCnpj}`;
    return crypto.createHash("sha1").update(content, "ascii").digest("hex");
  }

  private signLote(xml: string, certData: CertificateData): string {
    const sig = new SignedXml({
      privateKey: certData.privateKeyPem,
      publicCert: certData.certificatePem,
      canonicalizationAlgorithm: "http://www.w3.org/TR/2001/REC-xml-c14n-20010315",
      signatureAlgorithm: "http://www.w3.org/2000/09/xmldsig#rsa-sha1",
    });
    sig.addReference({
      xpath: `//*[local-name()='Lote']`,
      uri: "#lote:1",
      digestAlgorithm: "http://www.w3.org/2000/09/xmldsig#sha1",
      transforms: [
        "http://www.w3.org/2000/09/xmldsig#enveloped-signature",
        "http://www.w3.org/TR/2001/REC-xml-c14n-20010315",
      ],
    });
    sig.computeSignature(xml, {
      location: { reference: `//*[local-name()='Lote']`, action: "append" },
    });
    return sig.getSignedXml();
  }

  private sendSoap(content: string, operation: string, certData: CertificateData): Promise<string> {
    const soapEnvelope = [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:dsf="${DSF_SOROCABA.soapns}">`,
      `<soapenv:Body>`,
      `<dsf:${operation}>`,
      `<mensagemXml><![CDATA[${content}]]></mensagemXml>`,
      `</dsf:${operation}>`,
      `</soapenv:Body>`,
      `</soapenv:Envelope>`,
    ].join("");

    return new Promise((resolve, reject) => {
      const url = new URL(DSF_SOROCABA.url);
      const options: https.RequestOptions = {
        hostname: url.hostname,
        port: 443,
        path: url.pathname,
        method: "POST",
        headers: {
          "Content-Type": "text/xml;charset=UTF-8",
          "SOAPAction": `"${operation}"`,
          "Content-Length": Buffer.byteLength(soapEnvelope, "utf8"),
        },
        key: certData.privateKeyPem,
        cert: certData.certificatePem,
        rejectUnauthorized: false,
      };

      const req = https.request(options, (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8");
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(this.extractOutputXml(body));
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${body.substring(0, 500)}`));
          }
        });
      });

      req.on("error", (err) => reject(new Error(`Erro de conexão com Prefeitura de Sorocaba: ${err.message}`)));
      req.setTimeout(30000, () => { req.destroy(); reject(new Error("Timeout na comunicação com Prefeitura (30s)")); });
      req.write(soapEnvelope, "utf8");
      req.end();
    });
  }

  private extractOutputXml(soapResponse: string): string {
    const match = soapResponse.match(/<outputXML[^>]*>([\s\S]*?)<\/outputXML>/i)
      || soapResponse.match(/<return[^>]*>([\s\S]*?)<\/return>/i);
    if (match) {
      return match[1].replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "");
    }
    return soapResponse;
  }

  private findTag(obj: unknown, key: string): unknown {
    if (!obj || typeof obj !== "object") return null;
    const record = obj as Record<string, unknown>;
    if (key in record) return record[key];
    for (const v of Object.values(record)) {
      const found = this.findTag(v, key);
      if (found) return found;
    }
    return null;
  }

  private escapeXml(str: string): string {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
}
