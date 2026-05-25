import { prisma } from "@/infrastructure/database/prisma";
import { Prisma, WhatsAppMessageStatus } from "@prisma/client";
import {
  IWhatsAppRepository,
  WhatsAppConfigData,
  WhatsAppMessageData,
  CreateMessageData,
  SignatureData,
} from "@/domain/repositories/IWhatsAppRepository";
import { randomBytes } from "crypto";

export class PrismaWhatsAppRepository implements IWhatsAppRepository {
  async getConfig(tenantId: string): Promise<WhatsAppConfigData | null> {
    return prisma.whatsAppConfig.findUnique({ where: { tenantId } }) as Promise<WhatsAppConfigData | null>;
  }

  async upsertConfig(tenantId: string, data: Partial<WhatsAppConfigData>): Promise<WhatsAppConfigData> {
    return prisma.whatsAppConfig.upsert({
      where: { tenantId },
      update: { phoneNumberId: data.phoneNumberId, accessToken: data.accessToken, businessName: data.businessName, enabled: data.enabled },
      create: { tenantId, phoneNumberId: data.phoneNumberId, accessToken: data.accessToken, businessName: data.businessName, enabled: data.enabled ?? false },
    }) as Promise<WhatsAppConfigData>;
  }

  async createMessage(data: CreateMessageData): Promise<WhatsAppMessageData> {
    return prisma.whatsAppMessage.create({ data }) as unknown as Promise<WhatsAppMessageData>;
  }

  async updateMessageStatus(id: string, status: string, externalId?: string, error?: string): Promise<WhatsAppMessageData> {
    return prisma.whatsAppMessage.update({
      where: { id },
      data: { status: status as WhatsAppMessageStatus, externalId, error, sentAt: status === "SENT" ? new Date() : undefined },
    }) as unknown as Promise<WhatsAppMessageData>;
  }

  async findByExternalId(externalId: string): Promise<WhatsAppMessageData | null> {
    return prisma.whatsAppMessage.findFirst({ where: { externalId } }) as unknown as Promise<WhatsAppMessageData | null>;
  }

  async getMessages(tenantId: string, orderId?: string): Promise<WhatsAppMessageData[]> {
    const where: Prisma.WhatsAppMessageWhereInput = { tenantId };
    if (orderId) where.orderId = orderId;
    return prisma.whatsAppMessage.findMany({ where, orderBy: { createdAt: "desc" }, take: 50 }) as unknown as Promise<WhatsAppMessageData[]>;
  }

  async createSignatureToken(orderId: string, type: "APPROVAL" | "DELIVERY", signerName: string): Promise<SignatureData> {
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48h
    return prisma.signature.create({
      data: { orderId, type, signerName, token, expiresAt, imageData: "" },
    }) as unknown as Promise<SignatureData>;
  }

  async findSignatureByToken(token: string): Promise<SignatureData | null> {
    return prisma.signature.findUnique({ where: { token } }) as unknown as Promise<SignatureData | null>;
  }

  async completeSignature(id: string, imageData: string): Promise<SignatureData> {
    return prisma.signature.update({
      where: { id },
      data: { imageData, signedAt: new Date() },
    }) as unknown as Promise<SignatureData>;
  }

  async getSignaturesByOrder(orderId: string): Promise<SignatureData[]> {
    return prisma.signature.findMany({
      where: { orderId, signedAt: { not: null } },
      orderBy: { signedAt: "asc" },
    }) as unknown as Promise<SignatureData[]>;
  }
}
