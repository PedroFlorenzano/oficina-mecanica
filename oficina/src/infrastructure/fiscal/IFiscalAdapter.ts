export interface FiscalAuthorization {
  accessKey: string;
  protocolNumber: string;
  xmlContent: string;
  number: number;
  series: number;
  issueDate: Date;
}

export interface FiscalCancellation {
  protocolNumber: string;
  xmlContent: string;
}

export interface FiscalAdapterInput {
  type: "NFE" | "NFSE";
  number: number;
  series: number;
  cnpj: string;
  razaoSocial: string;
  inscricaoEstadual: string | null;
  inscricaoMunicipal: string | null;
  cityCode: string | null;
  items: { description: string; quantity: number; unitPrice: number; totalPrice: number; cfop?: string | null; ncm?: string | null; serviceCode?: string | null }[];
  totalAmount: number;
}

export interface IFiscalAdapter {
  authorize(input: FiscalAdapterInput): Promise<FiscalAuthorization>;
  cancel(accessKey: string, reason: string): Promise<FiscalCancellation>;
}
