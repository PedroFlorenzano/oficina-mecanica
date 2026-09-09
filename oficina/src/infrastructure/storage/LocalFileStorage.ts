import { readFile, writeFile, mkdir, unlink } from "fs/promises";
import { join, dirname, normalize } from "path";
import { IFileStorage, StoredFile } from "@/domain/storage/IFileStorage";

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

/**
 * Armazenamento em disco — usado em desenvolvimento e nos testes.
 *
 * Não serve para produção na Vercel: o filesystem de uma função serverless é
 * somente-leitura (exceto /tmp, que é efêmero). Em produção o storage externo
 * é selecionado por variável de ambiente; veja `infrastructure/storage/index.ts`.
 */
export class LocalFileStorage implements IFileStorage {
  constructor(private readonly baseDir: string = join(process.cwd(), "uploads")) {}

  /** Resolve a chave dentro do baseDir, barrando path traversal (`../`). */
  private resolve(key: string): string {
    const fullPath = normalize(join(this.baseDir, key));
    if (!fullPath.startsWith(normalize(this.baseDir))) {
      throw new Error("Caminho de arquivo inválido");
    }
    return fullPath;
  }

  /**
   * O content type não é persistido: em disco ele é derivado da extensão da
   * chave na leitura. Por isso a implementação ignora o terceiro parâmetro.
   */
  async save(key: string, content: Uint8Array): Promise<void> {
    const fullPath = this.resolve(key);
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, content);
  }

  async get(key: string): Promise<StoredFile | null> {
    try {
      const fullPath = this.resolve(key);
      const content = await readFile(fullPath);
      const ext = key.split(".").pop()?.toLowerCase() || "";
      return {
        content,
        contentType: MIME_BY_EXTENSION[ext] || "application/octet-stream",
      };
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await unlink(this.resolve(key));
    } catch {
      // Arquivo já ausente — remoção é idempotente por contrato
    }
  }
}
