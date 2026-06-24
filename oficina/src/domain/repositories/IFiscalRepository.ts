export interface FiscalConfigData {
  id: string;
  tenantId: string;
  enabled: boolean;
  environment: string;
  certificateBase64: string | null;
  certificatePassword: string | null;
  cnpj: string | null;
  inscricaoEstadual: string | null;
  inscricaoMunicipal: string | null;
  razaoSocial: string | null;
  nfeSeries: number;
  nfseSeries: string;
  nextNfeNumber: number;
  nextNfseNumber: number;
  cityCode: string | null;
  nfeCfop: string | null;
  nfeIndPag: string | null;
  nfeTpag: string | null;
  nfeFinNFe: string | null;
  nfeIndFinal: string | null;
  nfeIndPres: string | null;
  nfeTpEmis: string | null;
  emitLogradouro: string | null;
  emitNumero: string | null;
  emitBairro: string | null;
  emitCEP: string | null;
  cnae: string | null;
  codigoServico: string | null;
  codigoServicoMunicipal: string | null;
  descricaoServico: string | null;
  aliquotaISS: number | null;
  regimeEspecial: string | null;
  regimeApuracao: string | null;
  naturezaOperacao: string | null;
  tipoRPS: string | null;
  wsUsuario: string | null;
  wsSenha: string | null;
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
  order?: { number: number; client: { name: string; document: string; email?: string | null; phone?: string | null; address?: string | null } };
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
