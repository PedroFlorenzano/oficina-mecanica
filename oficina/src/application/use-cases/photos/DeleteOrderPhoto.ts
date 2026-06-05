import { IOrderPhotoRepository } from "@/domain/repositories/IOrderPhotoRepository";
import { NotFoundError } from "@/domain/errors/DomainError";
import { unlink } from "fs/promises";
import { join } from "path";

export class DeleteOrderPhoto {
  constructor(private readonly photoRepository: IOrderPhotoRepository) {}

  async execute(photoId: string) {
    const photo = await this.photoRepository.findById(photoId);
    if (!photo) {
      throw new NotFoundError("Foto", photoId);
    }

    // Remove file from disk
    try {
      await unlink(join(process.cwd(), "uploads", photo.filePath));
    } catch {
      // File may already be missing — proceed with DB deletion
    }

    await this.photoRepository.delete(photoId);
  }
}
