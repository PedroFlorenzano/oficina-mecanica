import { v2 as cloudinary } from "cloudinary";
import { IFileStorage, StoredFile } from "@/domain/storage/IFileStorage";

/**
 * Armazenamento no Cloudinary.
 *
 * Decisões de segurança:
 * - Uploads usam `type: "authenticated"`, então a imagem NÃO é acessível por
 *   URL adivinhável. Só quem tem o api_secret consegue montar a URL assinada.
 *   Isso importa: são fotos de veículos de clientes (dado pessoal, LGPD).
 * - A aplicação nunca entrega a URL do Cloudinary ao navegador. A rota
 *   `/api/uploads/[...path]` valida sessão e tenant e devolve os bytes.
 *   Assim não circula link que continue funcionando fora do sistema.
 *
 * A chave (`key`) é usada como `public_id`. O Cloudinary trata a extensão como
 * formato, então ela é removida do public_id e reaplicada na leitura.
 */
export class CloudinaryFileStorage implements IFileStorage {
  constructor(cloudName: string, apiKey: string, apiSecret: string) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
  }

  /** Separa `pasta/arquivo.jpg` em public_id (`pasta/arquivo`) e formato (`jpg`). */
  private split(key: string): { publicId: string; format?: string } {
    const lastDot = key.lastIndexOf(".");
    const lastSlash = key.lastIndexOf("/");
    if (lastDot > lastSlash && lastDot !== -1) {
      return { publicId: key.slice(0, lastDot), format: key.slice(lastDot + 1) };
    }
    return { publicId: key };
  }

  async save(key: string, content: Uint8Array, contentType: string): Promise<void> {
    const { publicId } = this.split(key);
    const base64 = Buffer.from(content).toString("base64");

    await cloudinary.uploader.upload(`data:${contentType};base64,${base64}`, {
      public_id: publicId,
      type: "authenticated",
      resource_type: "image",
      overwrite: false,
    });
  }

  async get(key: string): Promise<StoredFile | null> {
    const { publicId, format } = this.split(key);

    const signedUrl = cloudinary.url(publicId, {
      type: "authenticated",
      resource_type: "image",
      sign_url: true,
      secure: true,
      format,
    });

    const response = await fetch(signedUrl);
    if (!response.ok) {
      return null;
    }

    return {
      content: new Uint8Array(await response.arrayBuffer()),
      contentType: response.headers.get("content-type") || "application/octet-stream",
    };
  }

  async delete(key: string): Promise<void> {
    const { publicId } = this.split(key);
    try {
      await cloudinary.uploader.destroy(publicId, {
        type: "authenticated",
        resource_type: "image",
        invalidate: true,
      });
    } catch {
      // Remoção é idempotente por contrato: se já não existe, segue o fluxo
      // para que o registro no banco possa ser apagado de qualquer forma.
    }
  }
}
