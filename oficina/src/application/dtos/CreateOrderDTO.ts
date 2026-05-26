export interface CreateOrderDTO {
  clientId: string;
  vehicleId: string;
  mileage: number;
  notes?: string;
  complaints?: {
    description: string;
    services: { description: string; price: number; timeMinutes?: number; serviceId?: string; mechanicId?: string; commissionRate?: number }[];
    parts: { description: string; quantity: number; unitPrice: number; stockItemId?: string }[];
  }[];
  // Legacy flat format
  services?: { description: string; price: number; timeMinutes?: number; serviceId?: string; mechanicId?: string; commissionRate?: number }[];
  parts?: { description: string; quantity: number; unitPrice: number; stockItemId?: string }[];
}
