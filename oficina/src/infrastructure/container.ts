import { PrismaClientRepository } from "./repositories/PrismaClientRepository";
import { PrismaVehicleRepository } from "./repositories/PrismaVehicleRepository";
import { PrismaServiceOrderRepository } from "./repositories/PrismaServiceOrderRepository";
import { PrismaStockItemRepository } from "./repositories/PrismaStockItemRepository";
import { PrismaStockMovementRepository } from "./repositories/PrismaStockMovementRepository";
import { PrismaServiceCatalogRepository } from "./repositories/PrismaServiceCatalogRepository";
import { PrismaUserRepository } from "./repositories/PrismaUserRepository";
import { PrismaTimerLogRepository } from "@/infrastructure/repositories/PrismaTimerLogRepository";
import { PrismaCommissionRepository } from "@/infrastructure/repositories/PrismaCommissionRepository";
import { PrismaWhatsAppRepository } from "@/infrastructure/repositories/PrismaWhatsAppRepository";
import { PrismaFiscalRepository } from "@/infrastructure/repositories/PrismaFiscalRepository";

export const container = {
  clientRepository: new PrismaClientRepository(),
  vehicleRepository: new PrismaVehicleRepository(),
  orderRepository: new PrismaServiceOrderRepository(),
  stockItemRepository: new PrismaStockItemRepository(),
  stockMovementRepository: new PrismaStockMovementRepository(),
  serviceCatalogRepository: new PrismaServiceCatalogRepository(),
  userRepository: new PrismaUserRepository(),
  timerLogRepository: new PrismaTimerLogRepository(),
  commissionRepository: new PrismaCommissionRepository(),
  whatsAppRepository: new PrismaWhatsAppRepository(),
  fiscalRepository: new PrismaFiscalRepository(),
};
