import { PrismaClientRepository } from "./repositories/PrismaClientRepository";
import { PrismaVehicleRepository } from "./repositories/PrismaVehicleRepository";
import { PrismaServiceOrderRepository } from "./repositories/PrismaServiceOrderRepository";
import { PrismaStockItemRepository } from "./repositories/PrismaStockItemRepository";
import { PrismaStockMovementRepository } from "./repositories/PrismaStockMovementRepository";
import { PrismaServiceCatalogRepository } from "./repositories/PrismaServiceCatalogRepository";
import { PrismaUserRepository } from "./repositories/PrismaUserRepository";

export const container = {
  clientRepository: new PrismaClientRepository(),
  vehicleRepository: new PrismaVehicleRepository(),
  orderRepository: new PrismaServiceOrderRepository(),
  stockItemRepository: new PrismaStockItemRepository(),
  stockMovementRepository: new PrismaStockMovementRepository(),
  serviceCatalogRepository: new PrismaServiceCatalogRepository(),
  userRepository: new PrismaUserRepository(),
};
