import { mkdtemp, rm, readFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { LocalFileStorage } from "@/infrastructure/storage/LocalFileStorage";
import { IFileStorage } from "@/domain/storage/IFileStorage";
import {
  getFileStorage,
  isExternalStorageConfigured,
  resetFileStorageCache,
} from "@/infrastructure/storage";

describe("LocalFileStorage", () => {
  let baseDir: string;
  // Tipado pela interface de propósito: o teste valida o contrato de storage,
  // não a assinatura concreta desta implementação.
  let storage: IFileStorage;

  beforeEach(async () => {
    baseDir = await mkdtemp(join(tmpdir(), "operare-storage-"));
    storage = new LocalFileStorage(baseDir);
  });

  afterEach(async () => {
    await rm(baseDir, { recursive: true, force: true });
  });

  it("salva e recupera o mesmo conteúdo", async () => {
    const content = new Uint8Array([1, 2, 3, 4, 5]);

    await storage.save("t/tenant-a/orders/order-1/foto.jpg", content, "image/jpeg");
    const result = await storage.get("t/tenant-a/orders/order-1/foto.jpg");

    expect(result).not.toBeNull();
    expect(Array.from(result!.content)).toEqual([1, 2, 3, 4, 5]);
    expect(result!.contentType).toBe("image/jpeg");
  });

  it("cria os diretórios intermediários da chave", async () => {
    await storage.save("a/b/c/d.png", new Uint8Array([9]), "image/png");

    const written = await readFile(join(baseDir, "a", "b", "c", "d.png"));
    expect(Array.from(written)).toEqual([9]);
  });

  it("deduz o content type pela extensão", async () => {
    await storage.save("x.png", new Uint8Array([1]), "image/png");
    await storage.save("y.webp", new Uint8Array([1]), "image/webp");

    expect((await storage.get("x.png"))!.contentType).toBe("image/png");
    expect((await storage.get("y.webp"))!.contentType).toBe("image/webp");
  });

  it("retorna null para arquivo inexistente", async () => {
    expect(await storage.get("nao/existe.jpg")).toBeNull();
  });

  it("remove o arquivo", async () => {
    await storage.save("foto.jpg", new Uint8Array([1]), "image/jpeg");
    await storage.delete("foto.jpg");

    expect(await storage.get("foto.jpg")).toBeNull();
  });

  it("não lança ao remover arquivo inexistente", async () => {
    await expect(storage.delete("fantasma.jpg")).resolves.toBeUndefined();
  });

  it("barra path traversal na escrita", async () => {
    await expect(
      storage.save("../fora.jpg", new Uint8Array([1]), "image/jpeg")
    ).rejects.toThrow("Caminho de arquivo inválido");
  });

  it("barra path traversal na leitura", async () => {
    expect(await storage.get("../../etc/passwd")).toBeNull();
  });
});

describe("getFileStorage", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetFileStorageCache();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    resetFileStorageCache();
  });

  it("usa disco local quando o Cloudinary não está configurado", () => {
    delete process.env.CLOUDINARY_CLOUD_NAME;
    delete process.env.CLOUDINARY_API_KEY;
    delete process.env.CLOUDINARY_API_SECRET;

    expect(isExternalStorageConfigured()).toBe(false);
    expect(getFileStorage()).toBeInstanceOf(LocalFileStorage);
  });

  it("exige as três variáveis para considerar o storage externo configurado", () => {
    process.env.CLOUDINARY_CLOUD_NAME = "demo";
    process.env.CLOUDINARY_API_KEY = "123";
    delete process.env.CLOUDINARY_API_SECRET;

    expect(isExternalStorageConfigured()).toBe(false);
    expect(getFileStorage()).toBeInstanceOf(LocalFileStorage);
  });

  it("reaproveita a mesma instância entre chamadas", () => {
    expect(getFileStorage()).toBe(getFileStorage());
  });
});
