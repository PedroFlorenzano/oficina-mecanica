export interface FiscalConfigData {
  id: string;
  tenantId: string;
  enabled: boolean;
  environment: string;
  cnpj: string | null;
  inscricaoEstadual: string | null;
  inscricaoMunicipal: string | null;
  razaoSocial: string | null;
  nfeSeries: number;
  nfseSeries: number;
  nextNfeNumber: number;
  nextNfseNumber: number;
  cityCode: string | null;
}

export interface CreateInvoiceData {
  tenantId: string;
  orderId: string;
  type: "NFE" | "NFSE";
  totalAmount: number;
  items: { description: string; quantity: number; unitPrice: number; totalPrice: number; cfop?: string; ncm?: string; serviceCode?: string }[];
}

export interface IFiscalRepository {
  getConfig(tenantId: string): Promise<FiscalConfigData | null>;
  upsertConfig(tenantId: string, data: Partial<FiscalConfigData>): Promise<FiscalConfigData>;
  createInvoice(data: CreateInvoiceData): Promise<any>;
  findInvoiceById(id: string, tenantId: string): Promise<any | null>;
  findInvoicesByOrder(orderId: string, tenantId: string): Promise<any[]>;
  findAllInvoices(tenantId: string, filters?: { status?: string; type?: string }): Promise<any[]>;
  updateInvoiceStatus(id: string, data: { status: string; number?: number; series?: number; accessKey?: string; protocolNumber?: string; xmlContent?: string; issueDate?: Date; lastError?: string; retryCount?: number }): Promise<any>;
  cancelInvoice(id: string, reason: string): Promise<any>;
  incrementNextNumber(tenantId: string, type: "NFE" | "NFSE"): Promise<number>;
}
