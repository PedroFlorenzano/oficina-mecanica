import { FiscalConfigData } from "@/domain/repositories/IFiscalRepository";
import { IFiscalAdapter } from "./IFiscalAdapter";
import { FakeFiscalAdapter } from "./FakeFiscalAdapter";
import { SefazNFeAdapter, SefazAdapterConfig } from "./SefazNFeAdapter";
import { NacionalNfseAdapter, NacionalNfseConfig } from "./NacionalNfseAdapter";

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

  // NFS-e — Padrão Nacional (obrigatório desde 01/01/2026)
  if (type === "NFSE") {
    if (!config.cityCode) {
      return new FakeFiscalAdapter();
    }
    const nfseConfig: NacionalNfseConfig = {
      pfxBase64: config.certificateBase64!,
      pfxPassword: config.certificatePassword!,
      cnpj: (config.cnpj || "").replace(/\D/g, ""),
      inscricaoMunicipal: config.inscricaoMunicipal || "",
      razaoSocial: config.razaoSocial || "",
      cityCode: config.cityCode,
      codigoServico: config.codigoServico || "14.01",
      aliquotaISS: config.aliquotaISS || 5,
      serie: config.nfseSeries || "1",
      environment: config.environment as "homologation" | "production",
      descricaoServico: config.descricaoServico || undefined,
    };
    return new NacionalNfseAdapter(nfseConfig);
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
      xLgr: config.emitLogradouro || "",
      nro: config.emitNumero || "S/N",
      xBairro: config.emitBairro || "",
      cMun: config.cityCode || "",
      xMun: "",  // TODO: adicionar campo emitMunicipio na FiscalConfig
      UF: UF_FROM_IBGE[cUF] || "SP",
      CEP: config.emitCEP || "",
    },
    finNFe: config.nfeFinNFe || "1",
    indFinal: config.nfeIndFinal || "1",
    indPres: config.nfeIndPres || "1",
    tpEmis: config.nfeTpEmis || "1",
    tPag: config.nfeTpag || "99",
    indPag: config.nfeIndPag || "0",
  };
  return new SefazNFeAdapter(adapterConfig);
}
