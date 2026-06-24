import { FiscalConfigData } from "@/domain/repositories/IFiscalRepository";
import { IFiscalAdapter } from "./IFiscalAdapter";
import { FakeFiscalAdapter } from "./FakeFiscalAdapter";
import { SefazNFeAdapter, SefazAdapterConfig } from "./SefazNFeAdapter";

/**
 * Cria o adapter fiscal correto baseado na configuração do tenant.
 * - environment "homologation" ou "production" → SefazNFeAdapter (real)
 * - qualquer outro → FakeFiscalAdapter (simulado)
 */
export function createFiscalAdapter(config: FiscalConfigData): IFiscalAdapter {
  if (
    (config.environment === "homologation" || config.environment === "production") &&
    config.certificateBase64 &&
    config.certificatePassword
  ) {
    const tpAmb = config.environment === "production" ? 1 : 2;
    const adapterConfig: SefazAdapterConfig = {
      pfxBase64: config.certificateBase64,
      pfxPassword: config.certificatePassword,
      tpAmb: tpAmb as 1 | 2,
      cUF: "35", // SP — TODO: derivar do cityCode
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

  return new FakeFiscalAdapter();
}
