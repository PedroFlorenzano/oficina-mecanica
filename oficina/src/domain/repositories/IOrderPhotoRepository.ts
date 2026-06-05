export interface OrderPhoto {
  id: string;
  orderId: string;
  category: "BEFORE" | "AFTER" | "DAMAGE";
  description: string | null;
  filePath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedById: string;
  createdAt: Date;
  uploadedBy?: { name: string };
}

export interface IOrderPhotoRepository {
  create(data: Omit<OrderPhoto, "id" | "createdAt" | "uploadedBy">): Promise<OrderPhoto>;
  findByOrderId(orderId: string): Promise<OrderPhoto[]>;
  findById(id: string): Promise<OrderPhoto | null>;
  delete(id: string): Promise<void>;
}
