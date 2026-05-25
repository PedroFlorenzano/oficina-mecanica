export interface UpdateOrderDTO {
  complaints: {
    description: string;
    services: { description: string; price: number; timeMinutes?: number; serviceId?: string; mechanicId?: string }[];
    parts: { description: string; quantity: number; unitPrice: number; stockItemId?: string }[];
  }[];
  notes?: string;
}
