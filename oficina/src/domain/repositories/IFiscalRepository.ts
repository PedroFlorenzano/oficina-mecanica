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

export interface FiscalInvoiceItemData {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  cfop: string | null;
  ncm: string | null;
  serviceCode: string | null;
}

export interface FiscalInvoiceData {
  id: string;
  tenantId: string;
  orderId: string;
  type: string;
  status: string;
  number: number | null;
  series: number | null;
  accessKey: string | null;
  protocolNumber: string | null;
  xmlContent: string | null;
  pdfUrl: string | null;
  totalAmount: number;
  issueDate: Date | null;
  cancelDate: Date | null;
  cancelReason: string | null;
  retryCount: number;
  createdAt: Date;
  items?: FiscalInvoiceItemData[];
  order?: { number: number; client: { name: string } };
}

export interface IFiscalRepository {
  getConfig(tenantId: string): Promise<FiscalConfigData | null>;
  upsertConfig(tenantId: string, data: Partial<FiscalConfigData>): Promise<FiscalConfigData>;
  createInvoice(data: CreateInvoiceData): Promise<FiscalInvoiceData>;
  findInvoiceById(id: string, tenantId: string): Promise<FiscalInvoiceData | null>;
  findInvoicesByOrder(orderId: string, tenantId: string): Promise<FiscalInvoiceData[]>;
  findAllInvoices(tenantId: string, filters?: { status?: string; type?: string }): Promise<FiscalInvoiceData[]>;
  updateInvoiceStatus(id: string, data: { status: string; number?: number; series?: number; accessKey?: string; protocolNumber?: string; xmlContent?: string; issueDate?: Date; lastError?: string; retryCount?: number }): Promise<FiscalInvoiceData>;
  cancelInvoice(id: string, reason: string): Promise<FiscalInvoiceData>;
  incrementNextNumber(tenantId: string, type: "NFE" | "NFSE"): Promise<number>;
}
