export interface VehicleData {
  id: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  yearModel?: number | null;
  color: string | null;
  fuel: string | null;
  chassis: string | null;
  mileage: number;
  clientId: string;
  tenantId: string;
  client?: { id: string; name: string };
}

export interface IVehicleRepository {
  findById(id: string): Promise<VehicleData | null>;
  findByPlate(plate: string, tenantId: string): Promise<VehicleData | null>;
  findByPlateExcluding(plate: string, tenantId: string, excludeId: string): Promise<VehicleData | null>;
  search(query: string, tenantId: string): Promise<VehicleData[]>;
  findAll(tenantId: string): Promise<VehicleData[]>;
  create(data: Omit<VehicleData, "id" | "client">): Promise<VehicleData>;
  update(id: string, data: Partial<Omit<VehicleData, "id" | "client">>): Promise<VehicleData>;
  updateMileage(id: string, mileage: number): Promise<void>;
  delete(id: string): Promise<void>;
  countOrders(id: string): Promise<number>;
}
