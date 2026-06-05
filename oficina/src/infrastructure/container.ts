import { PrismaClient } from "@prisma/client";
import { withTenant, prismaAdmin } from "./database/prisma";
import { PrismaClientRepository } from "./repositories/PrismaClientRepository";
import { PrismaVehicleRepository } from "./repositories/PrismaVehicleRepository";
import { PrismaServiceOrderRepository } from "./repositories/PrismaServiceOrderRepository";
import { PrismaStockItemRepository } from "./repositories/PrismaStockItemRepository";
import { PrismaStockMovementRepository } from "./repositories/PrismaStockMovementRepository";
import { PrismaServiceCatalogRepository } from "./repositories/PrismaServiceCatalogRepository";
import { PrismaUserRepository } from "./repositories/PrismaUserRepository";
import { PrismaTimerLogRepository } from "./repositories/PrismaTimerLogRepository";
import { PrismaCommissionRepository } from "./repositories/PrismaCommissionRepository";
import { PrismaWhatsAppRepository } from "./repositories/PrismaWhatsAppRepository";
import { PrismaFiscalRepository } from "./repositories/PrismaFiscalRepository";

function buildContainer(db: PrismaClient) {
  return {
    clientRepository: new PrismaClientRepository(db),
    vehicleRepository: new PrismaVehicleRepository(db),
    orderRepository: new PrismaServiceOrderRepository(db),
    stockItemRepository: new PrismaStockItemRepository(db),
    stockMovementRepository: new PrismaStockMovementRepository(db),
    serviceCatalogRepository: new PrismaServiceCatalogRepository(db),
    userRepository: new PrismaUserRepository(db),
    timerLogRepository: new PrismaTimerLogRepository(db),
    commissionRepository: new PrismaCommissionRepository(db),
    whatsAppRepository: new PrismaWhatsAppRepository(db),
    fiscalRepository: new PrismaFiscalRepository(db),
  };
}

export type Container = ReturnType<typeof buildContainer>;

/**
 * Cria container com contexto de tenant (RLS ativo).
 * Defense in depth: RLS também filtra no banco
 */
export function createContainer(tenantId: string): Container {
  const db = withTenant(tenantId);
  return buildContainer(db);
}

/**
 * Container admin para operações cross-tenant legítimas.
 * BYPASSRLS: login (findByEmail), assinatura pública, webhook WhatsApp, cron reminders.
 */
export const adminContainer: Container = buildContainer(prismaAdmin);
