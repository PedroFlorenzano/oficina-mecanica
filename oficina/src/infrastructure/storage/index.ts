import { IFileStorage } from "@/domain/storage/IFileStorage";
import { LocalFileStorage } from "./LocalFileStorage";
import { CloudinaryFileStorage } from "./CloudinaryFileStorage";

let cached: IFileStorage | null = null;

/** True quando as credenciais do Cloudinary estão presentes no ambiente. */
export function isExternalStorageConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

/**
 * Retorna o storage ativo: Cloudinary quando configurado, disco local caso
 * contrário (desenvolvimento e CI). Instância reaproveitada entre chamadas.
 */
export function getFileStorage(): IFileStorage {
  if (cached) {
    return cached;
  }

  cached = isExternalStorageConfigured()
    ? new CloudinaryFileStorage(
        process.env.CLOUDINARY_CLOUD_NAME as string,
        process.env.CLOUDINARY_API_KEY as string,
        process.env.CLOUDINARY_API_SECRET as string
      )
    : new LocalFileStorage();

  return cached;
}

/** Apenas para testes: descarta a instância memoizada. */
export function resetFileStorageCache(): void {
  cached = null;
}

export type { IFileStorage };
