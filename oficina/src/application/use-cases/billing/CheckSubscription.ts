import { PrismaClient } from "@prisma/client";
import { ForbiddenError } from "@/domain/errors/DomainError";

export type BillingStatus = "active" | "past_due" | "suspended" | "cancelled";
export type Plan = "trial" | "basic" | "professional" | "enterprise";

interface TenantBilling {
  plan: string;
  planExpiresAt: Date | null;
  billingStatus: string;
}

export class CheckSubscription {
  constructor(private readonly db: PrismaClient) {}

  async execute(tenantId: string): Promise<TenantBilling> {
    const tenant = await this.db.tenant.findUnique({
      where: { id: tenantId },
      select: { plan: true, planExpiresAt: true, billingStatus: true },
    });

    if (!tenant) {
      throw new ForbiddenError("Tenant não encontrado.");
    }

    // Block access for suspended/cancelled tenants
    if (tenant.billingStatus === "suspended" || tenant.billingStatus === "cancelled") {
      throw new ForbiddenError("Sua assinatura está suspensa. Entre em contato com o suporte.");
    }

    // Check trial expiration
    if (tenant.plan === "trial" && tenant.planExpiresAt && new Date() > tenant.planExpiresAt) {
      throw new ForbiddenError("Seu período de teste expirou. Escolha um plano para continuar.");
    }

    return tenant;
  }
}
