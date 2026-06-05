import { IOrderPhotoRepository } from "@/domain/repositories/IOrderPhotoRepository";
import { ValidationError } from "@/domain/errors/DomainError";

interface UploadPhotoInput {
  orderId: string;
  category: "BEFORE" | "AFTER" | "DAMAGE";
  description?: string;
  filePath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export class UploadOrderPhoto {
  constructor(private readonly photoRepository: IOrderPhotoRepository) {}

  async execute(input: UploadPhotoInput, userId: string) {
    if (!ALLOWED_MIME_TYPES.includes(input.mimeType)) {
      throw new ValidationError("Tipo de arquivo não permitido. Use JPEG, PNG ou WebP.");
    }
    if (input.sizeBytes > MAX_SIZE_BYTES) {
      throw new ValidationError("Arquivo muito grande. Máximo permitido: 10MB.");
    }
    if (!input.fileName.trim()) {
      throw new ValidationError("Nome do arquivo é obrigatório.");
    }

    return this.photoRepository.create({
      orderId: input.orderId,
      category: input.category,
      description: input.description?.trim() || null,
      filePath: input.filePath,
      fileName: input.fileName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      uploadedById: userId,
    });
  }
}
