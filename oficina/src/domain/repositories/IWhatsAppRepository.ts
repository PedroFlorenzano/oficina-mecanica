export interface WhatsAppConfigData {
  id: string;
  tenantId: string;
  phoneNumberId: string | null;
  accessToken: string | null;
  businessName: string | null;
  enabled: boolean;
}

export interface WhatsAppMessageData {
  id: string;
  tenantId: string;
  orderId: string | null;
  type: string;
  to: string;
  content: string;
  status: string;
  externalId: string | null;
  error: string | null;
  sentAt: Date | null;
  createdAt: Date;
}

export interface CreateMessageData {
  tenantId: string;
  orderId?: string;
  type: "APPROVAL_LINK" | "DELIVERY_NOTIFICATION" | "MAINTENANCE_REMINDER";
  to: string;
  content: string;
}

export interface SignatureData {
  id: string;
  orderId: string;
  type: string;
  imageData: string;
  signerName: string;
  token: string;
  expiresAt: Date;
  signedAt: Date | null;
}

export interface IWhatsAppRepository {
  getConfig(tenantId: string): Promise<WhatsAppConfigData | null>;
  upsertConfig(tenantId: string, data: Partial<WhatsAppConfigData>): Promise<WhatsAppConfigData>;
  createMessage(data: CreateMessageData): Promise<WhatsAppMessageData>;
  updateMessageStatus(id: string, status: string, externalId?: string, error?: string): Promise<WhatsAppMessageData>;
  getMessages(tenantId: string, orderId?: string): Promise<WhatsAppMessageData[]>;
  createSignatureToken(orderId: string, type: "APPROVAL" | "DELIVERY", signerName: string): Promise<SignatureData>;
  findSignatureByToken(token: string): Promise<SignatureData | null>;
  completeSignature(id: string, imageData: string): Promise<SignatureData>;
  getSignaturesByOrder(orderId: string): Promise<SignatureData[]>;
}
