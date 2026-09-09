import { IOrderPhotoRepository } from "@/domain/repositories/IOrderPhotoRepository";
import { IFileStorage } from "@/domain/storage/IFileStorage";
import { NotFoundError } from "@/domain/errors/DomainError";

export class DeleteOrderPhoto {
  constructor(
    private readonly photoRepository: IOrderPhotoRepository,
    private readonly fileStorage: IFileStorage
  ) {}

  /**
   * @param expectedTenantPrefix quando informado, a foto só é excluída se sua
   * chave pertencer a esse tenant. Evita exclusão cruzada entre oficinas.
   */
  async execute(photoId: string, expectedTenantPrefix?: string) {
    const photo = await this.photoRepository.findById(photoId);
    if (!photo) {
      throw new NotFoundError("Foto", photoId);
    }

    if (
      expectedTenantPrefix &&
      photo.filePath.startsWith("t/") &&
      !photo.filePath.startsWith(`t/${expectedTenantPrefix}/`)
    ) {
      throw new NotFoundError("Foto", photoId);
    }

    // Remove o arquivo antes do registro. Se a remoção falhar, o storage pode
    // ficar com um órfão, o que é preferível a um registro apontando para nada.
    await this.fileStorage.delete(photo.filePath);

    await this.photoRepository.delete(photoId);
  }
}
