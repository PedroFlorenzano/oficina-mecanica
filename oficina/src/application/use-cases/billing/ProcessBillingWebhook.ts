import { PrismaClient } from "@prisma/client";
import { ValidationError } from "@/domain/errors/DomainError";

type BillingEvent =
  | "payment_confirmed"
  | "payment_overdue"
  | "subscription_cancelled"
  | "subscription_renewed"
  | "subscription_upgraded";

interface WebhookPayload {
  event: BillingEvent;
  tenantId: string;
  plan?: string;
  expiresAt?: string;
}

export class ProcessBillingWebhook {
  constructor(private readonly db: PrismaClient) {}

  async execute(payload: WebhookPayload): Promise<void> {
    if (!payload.tenantId || !payload.event) {
      throw new ValidationError("Payload inválido: tenantId e event são obrigatórios.");
    }

    const updateData: Record<string, unknown> = {};

    switch (payload.event) {
      case "payment_confirmed":
      case "subscription_renewed":
        updateData.billingStatus = "active";
        if (payload.plan) updateData.plan = payload.plan;
        if (payload.expiresAt) updateData.planExpiresAt = new Date(payload.expiresAt);
        break;

      case "payment_overdue":
        updateData.billingStatus = "past_due";
        break;

      case "subscription_cancelled":
        updateData.billingStatus = "suspended";
        break;

      case "subscription_upgraded":
        updateData.billingStatus = "active";
        if (payload.plan) updateData.plan = payload.plan;
        if (payload.expiresAt) updateData.planExpiresAt = new Date(payload.expiresAt);
        break;

      default:
        return; // Unknown event — ignore
    }

    await this.db.tenant.update({
      where: { id: payload.tenantId },
      data: updateData,
    });
  }
}
