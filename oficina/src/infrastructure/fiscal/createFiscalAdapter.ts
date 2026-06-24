import { FiscalConfigData } from "@/domain/repositories/IFiscalRepository";
import { IFiscalAdapter } from "./IFiscalAdapter";
import { FakeFiscalAdapter } from "./FakeFiscalAdapter";
import { SefazNFeAdapter, SefazAdapterConfig } from "./SefazNFeAdapter";
import { SorocabaNFSeAdapter, SorocabaNFSeConfig } from "./SorocabaNFSeAdapter";

/**
 * Cria o adapter fiscal correto baseado na configuração do tenant e tipo de documento.
 * - NFS-e + Sorocaba (cityCode 3552205) → SorocabaNFSeAdapter (DSF)
 * - NF-e + certificado → SefazNFeAdapter
 * - Sem certificado → FakeFiscalAdapter
 */
export function createFiscalAdapter(config: FiscalConfigData, type?: "NFE" | "NFSE"): IFiscalAdapter {
  const hasRealCert = !!(config.certificateBase64 && config.certificatePassword);
  const isReal = config.environment === "homologation" || config.environment === "production";

  if (!isReal || !hasRealCert) {
    return new FakeFiscalAdapter();
  }

  // NFS-e para Sorocaba (sistema DSF)
  if (type === "NFSE" && config.cityCode === "3552205") {
    const nfseConfig: SorocabaNFSeConfig = {
      pfxBase64: config.certificateBase64!,
      pfxPassword: config.certificatePassword!,
      cnpj: (config.cnpj || "").replace(/\D/g, ""),
      inscricaoMunicipal: config.inscricaoMunicipal || "",
      razaoSocial: config.razaoSocial || "",
      codigoServico: "1401",  // LC116 item 14.01 — manutenção veículos
      aliquotaISS: 2.01,      // 2.01% conforme config Paiffer
      serie: "U",
    };
    return new SorocabaNFSeAdapter(nfseConfig);
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
