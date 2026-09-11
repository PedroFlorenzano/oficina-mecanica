import { PrismaClient, Prisma, WhatsAppMessageStatus } from "@prisma/client";
import {
  IWhatsAppRepository,
  WhatsAppConfigData,
  WhatsAppMessageData,
  CreateMessageData,
  SignatureData,
} from "@/domain/repositories/IWhatsAppRepository";
import { randomBytes } from "crypto";

export class PrismaWhatsAppRepository implements IWhatsAppRepository {
  // Defense in depth: RLS também filtra no banco
  constructor(private readonly db: PrismaClient) {}

  async getConfig(tenantId: string): Promise<WhatsAppConfigData | null> {
    return this.db.whatsAppConfig.findUnique({ where: { tenantId } }) as Promise<WhatsAppConfigData | null>;
  }

  async upsertConfig(tenantId: string, data: Partial<WhatsAppConfigData>): Promise<WhatsAppConfigData> {
    // Só grava os campos presentes em `data` (a tela envia conexão e templates em telas separadas)
    const templateKeys = [
      "msgStatusUpdate",
      "msgDeliveryReady",
      "msgOilReminder",
      "msgAppointment",
      "msgBirthday",
      "msgReturnReminder",
    ] as const;

    const update: Prisma.WhatsAppConfigUpdateInput = {};
    if ("phoneNumberId" in data) update.phoneNumberId = data.phoneNumberId;
    if ("accessToken" in data) update.accessToken = data.accessToken;
    if ("businessName" in data) update.businessName = data.businessName;
    if ("enabled" in data) update.enabled = data.enabled;
    for (const key of templateKeys) {
      if (key in data) update[key] = data[key];
    }

    return this.db.whatsAppConfig.upsert({
      where: { tenantId },
      update,
      create: {
        tenantId,
        phoneNumberId: data.phoneNumberId,
        accessToken: data.accessToken,
        businessName: data.businessName,
        enabled: data.enabled ?? false,
        msgStatusUpdate: data.msgStatusUpdate,
        msgDeliveryReady: data.msgDeliveryReady,
        msgOilReminder: data.msgOilReminder,
        msgAppointment: data.msgAppointment,
        msgBirthday: data.msgBirthday,
        msgReturnReminder: data.msgReturnReminder,
      },
    }) as Promise<WhatsAppConfigData>;
  }

  async createMessage(data: CreateMessageData): Promise<WhatsAppMessageData> {
    return this.db.whatsAppMessage.create({ data }) as unknown as Promise<WhatsAppMessageData>;
  }

  async updateMessageStatus(id: string, status: string, externalId?: string, error?: string): Promise<WhatsAppMessageData> {
    return this.db.whatsAppMessage.update({
      where: { id },
      data: { status: status as WhatsAppMessageStatus, externalId, error, sentAt: status === "SENT" ? new Date() : undefined },
    }) as unknown as Promise<WhatsAppMessageData>;
  }

  async findByExternalId(externalId: string): Promise<WhatsAppMessageData | null> {
    return this.db.whatsAppMessage.findFirst({ where: { externalId } }) as unknown as Promise<WhatsAppMessageData | null>;
  }

  async getMessages(tenantId: string, orderId?: string): Promise<WhatsAppMessageData[]> {
    const where: Prisma.WhatsAppMessageWhereInput = { tenantId };
    if (orderId) where.orderId = orderId;
    return this.db.whatsAppMessage.findMany({ where, orderBy: { createdAt: "desc" }, take: 50 }) as unknown as Promise<WhatsAppMessageData[]>;
  }

  async createSignatureToken(orderId: string, type: "APPROVAL" | "DELIVERY", signerName: string): Promise<SignatureData> {
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    return this.db.signature.create({
      data: { orderId, type, signerName, token, expiresAt, imageData: "" },
    }) as unknown as Promise<SignatureData>;
  }

  async findSignatureByToken(token: string): Promise<SignatureData | null> {
    return this.db.signature.findUnique({ where: { token } }) as unknown as Promise<SignatureData | null>;
  }

  async completeSignature(id: string, imageData: string): Promise<SignatureData> {
    return this.db.signature.update({
      where: { id },
      data: { imageData, signedAt: new Date() },
    }) as unknown as Promise<SignatureData>;
  }

  async getSignaturesByOrder(orderId: string): Promise<SignatureData[]> {
    return this.db.signature.findMany({
      where: { orderId, signedAt: { not: null } },
      orderBy: { signedAt: "asc" },
    }) as unknown as Promise<SignatureData[]>;
  }
}
