export interface UpdateOrderDTO {
  complaints: {
    description: string;
    services: { description: string; price: number; timeMinutes?: number; serviceId?: string; mechanicId?: string; approved?: boolean }[];
    parts: { description: string; quantity: number; unitPrice: number; costPrice?: number | null; stockItemId?: string; approved?: boolean }[];
  }[];
  notes?: string;
  attendantId?: string | null;
  mileageOut?: number | null;
}
