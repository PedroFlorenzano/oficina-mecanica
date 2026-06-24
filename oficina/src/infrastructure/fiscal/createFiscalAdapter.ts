import { FiscalConfigData } from "@/domain/repositories/IFiscalRepository";
import { IFiscalAdapter } from "./IFiscalAdapter";
import { FakeFiscalAdapter } from "./FakeFiscalAdapter";
import { SefazNFeAdapter, SefazAdapterConfig } from "./SefazNFeAdapter";
import { NFSeNacionalAdapter, NFSeNacionalConfig } from "./SorocabaNFSeAdapter";

/**
 * Cria o adapter fiscal correto baseado na configuração do tenant e tipo de documento.
 * - NFS-e → NFSeNacionalAdapter (padrão nacional SEFIN)
 * - NF-e + certificado → SefazNFeAdapter
 * - Sem certificado → FakeFiscalAdapter
 */
export function createFiscalAdapter(config: FiscalConfigData, type?: "NFE" | "NFSE"): IFiscalAdapter {
  const hasRealCert = !!(config.certificateBase64 && config.certificatePassword);
  const isReal = config.environment === "homologation" || config.environment === "production";

  if (!isReal || !hasRealCert) {
    return new FakeFiscalAdapter();
  }

  // NFS-e via padrão nacional (SEFIN)
  if (type === "NFSE") {
    const nfseConfig: NFSeNacionalConfig = {
      pfxBase64: config.certificateBase64!,
      pfxPassword: config.certificatePassword!,
      cnpj: (config.cnpj || "").replace(/\D/g, ""),
      inscricaoMunicipal: config.inscricaoMunicipal || "",
      razaoSocial: config.razaoSocial || "",
      cLocEmi: config.cityCode || "3552205",
      cTribNac: "01020700", // TODO: buscar formato correto no XSD (TSCodTribNac pattern) — manutenção veículos LC116 14.01
      cTribMun: "7102",     // Código tributação municipal Sorocaba
      production: config.environment === "production",
    };
    return new NFSeNacionalAdapter(nfseConfig);
  }

  // NF-e via SEFAZ-SP
  const tpAmb = config.environment === "production" ? 1 : 2;
  const adapterConfig: SefazAdapterConfig = {
    pfxBase64: config.certificateBase64!,
    pfxPassword: config.certificatePassword!,
    tpAmb: tpAmb as 1 | 2,
    cUF: "35",
    cMunFG: config.cityCode || "3552205",
    enderEmit: {
      xLgr: "RUA GABRIELLA CORRA",
      nro: "492",
      xBairro: "IBITI RESERVA",
      cMun: config.cityCode || "3552205",
      xMun: "SOROCABA",
      UF: "SP",
      CEP: "18086757",
    },
  };
  return new SefazNFeAdapter(adapterConfig);
}
