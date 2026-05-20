export interface CreateVehicleDTO {
  plate: string;
  brand: string;
  model: string;
  year: number;
  yearModel?: number | null;
  color?: string;
  fuel?: string;
  chassis?: string;
  mileage?: number;
  clientId: string;
}
