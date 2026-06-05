import { PrismaClient } from "@prisma/client";
import { IOrderPhotoRepository, OrderPhoto } from "@/domain/repositories/IOrderPhotoRepository";

export class PrismaOrderPhotoRepository implements IOrderPhotoRepository {
  constructor(private readonly db: PrismaClient) {}

  async create(data: Omit<OrderPhoto, "id" | "createdAt" | "uploadedBy">): Promise<OrderPhoto> {
    return this.db.orderPhoto.create({
      data,
      include: { uploadedBy: { select: { name: true } } },
    }) as unknown as OrderPhoto;
  }

  async findByOrderId(orderId: string): Promise<OrderPhoto[]> {
    return this.db.orderPhoto.findMany({
      where: { orderId },
      include: { uploadedBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }) as unknown as OrderPhoto[];
  }

  async findById(id: string): Promise<OrderPhoto | null> {
    return this.db.orderPhoto.findUnique({
      where: { id },
      include: { uploadedBy: { select: { name: true } } },
    }) as unknown as OrderPhoto | null;
  }

  async delete(id: string): Promise<void> {
    await this.db.orderPhoto.delete({ where: { id } });
  }
}
