import { FiscalConfigData } from "@/domain/repositories/IFiscalRepository";
import { IFiscalAdapter } from "./IFiscalAdapter";
import { FakeFiscalAdapter } from "./FakeFiscalAdapter";
import { SefazNFeAdapter, SefazAdapterConfig } from "./SefazNFeAdapter";
import { SorocabaNFSeAdapter, SorocabaNFSeConfig } from "./SorocabaNFSeAdapter";

// Municípios DSF conhecidos (url, siaf, soapns)
// Fonte: nfephp-org/sped-nfse-dsf
const DSF_MUNICIPIOS: Record<string, { url: string; siaf: string; soapns: string; nome: string }> = {
  "3552205": { url: "https://www.issdigitalsod.com.br/WsNFe2/LoteRps.jws", siaf: "7145", soapns: "http://proces.wsnfe2.dsfnet.com.br", nome: "SOROCABA" },
  "3509502": { url: "https://issdigital.campinas.sp.gov.br/WsNFe2/LoteRps.jws", siaf: "6291", soapns: "http://proces.wsnfe2.dsfnet.com.br", nome: "CAMPINAS" },
  "5002704": { url: "https://issdigital.pmcg.ms.gov.br/WsNFe2/LoteRps.jws", siaf: "9051", soapns: "http://proces.wsnfe2.dsfnet.com.br", nome: "CAMPO GRANDE" },
  "3170206": { url: "https://udigital.uberlandia.mg.gov.br/WsNFe2/LoteRps.jws", siaf: "5403", soapns: "http://proces.wsnfe2.dsfnet.com.br", nome: "UBERLANDIA" },
};

// UF a partir dos 2 primeiros dígitos do código IBGE
const UF_FROM_IBGE: Record<string, string> = {
  "11": "RO", "12": "AC", "13": "AM", "14": "RR", "15": "PA", "16": "AP", "17": "TO",
  "21": "MA", "22": "PI", "23": "CE", "24": "RN", "25": "PB", "26": "PE", "27": "AL", "28": "SE", "29": "BA",
  "31": "MG", "32": "ES", "33": "RJ", "35": "SP",
  "41": "PR", "42": "SC", "43": "RS",
  "50": "MS", "51": "MT", "52": "GO", "53": "DF",
};

/**
 * Cria o adapter fiscal correto baseado na configuração do tenant e tipo de documento.
 * Totalmente genérico — usa os dados configurados pelo admin na tela /dashboard/fiscal.
 */
export function createFiscalAdapter(config: FiscalConfigData, type?: "NFE" | "NFSE"): IFiscalAdapter {
  const hasRealCert = !!(config.certificateBase64 && config.certificatePassword);
  const isReal = config.environment === "homologation" || config.environment === "production";

  if (!isReal || !hasRealCert) {
    return new FakeFiscalAdapter();
  }

  // NFS-e — verifica se o município está no catálogo DSF
  if (type === "NFSE" && config.cityCode && DSF_MUNICIPIOS[config.cityCode]) {
    const municipio = DSF_MUNICIPIOS[config.cityCode];
    const nfseConfig: SorocabaNFSeConfig = {
      pfxBase64: config.certificateBase64!,
      pfxPassword: config.certificatePassword!,
      cnpj: (config.cnpj || "").replace(/\D/g, ""),
      inscricaoMunicipal: config.inscricaoMunicipal || "",
      razaoSocial: config.razaoSocial || "",
      codigoServico: config.codigoServico || "1401",
      aliquotaISS: config.aliquotaISS || 5,
      serie: config.nfseSeries || "U",
      wsUsuario: config.wsUsuario || undefined,
      wsSenha: config.wsSenha || undefined,
      // Dados do município (do catálogo)
      municipioUrl: municipio.url,
      municipioSiaf: municipio.siaf,
      municipioSoapns: municipio.soapns,
      municipioCodigo: config.cityCode,
      municipioNome: municipio.nome,
    };
    return new SorocabaNFSeAdapter(nfseConfig);
  }

  // NF-e via SEFAZ
  const cUF = config.cityCode ? config.cityCode.substring(0, 2) : "35";
  const tpAmb = config.environment === "production" ? 1 : 2;
  const adapterConfig: SefazAdapterConfig = {
    pfxBase64: config.certificateBase64!,
    pfxPassword: config.certificatePassword!,
    tpAmb: tpAmb as 1 | 2,
    cUF,
    cMunFG: config.cityCode || "",
    enderEmit: {
      xLgr: "", // Preenchido na emissão a partir do cadastro do tenant
      nro: "",
      xBairro: "",
      cMun: config.cityCode || "",
      xMun: "",
      UF: UF_FROM_IBGE[cUF] || "SP",
      CEP: "",
    },
  };
  return new SefazNFeAdapter(adapterConfig);
}
