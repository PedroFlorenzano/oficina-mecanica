import { PrismaClientRepository } from "./repositories/PrismaClientRepository";
import { PrismaVehicleRepository } from "./repositories/PrismaVehicleRepository";
import { PrismaServiceOrderRepository } from "./repositories/PrismaServiceOrderRepository";
import { PrismaStockItemRepository } from "./repositories/PrismaStockItemRepository";
import { PrismaServiceCatalogRepository } from "./repositories/PrismaServiceCatalogRepository";

export const container = {
  clientRepository: new PrismaClientRepository(),
  vehicleRepository: new PrismaVehicleRepository(),
  orderRepository: new PrismaServiceOrderRepository(),
  stockItemRepository: new PrismaStockItemRepository(),
  serviceCatalogRepository: new PrismaServiceCatalogRepository(),
};
