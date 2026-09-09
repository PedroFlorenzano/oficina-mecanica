/**
 * Compressão de imagem no navegador, antes do upload.
 *
 * Por que isso é necessário: uma função serverless na Vercel recusa corpos
 * acima de ~4,5 MB, e foto de celular passa disso com facilidade (12 MP gera
 * de 4 a 8 MB). Sem comprimir, o upload falha antes de chegar à aplicação.
 *
 * Também economiza cota do provedor de armazenamento e deixa a galeria da OS
 * mais leve para abrir na oficina, onde a conexão costuma ser ruim.
 */

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;

export interface CompressionResult {
  file: File;
  originalBytes: number;
  compressedBytes: number;
}

/**
 * Redimensiona para no máximo 1600px no maior lado e recodifica em JPEG.
 * Se a imagem não puder ser decodificada (formato exótico, HEIC em navegador
 * sem suporte), devolve o arquivo original para o servidor decidir.
 */
export async function compressImage(file: File): Promise<CompressionResult> {
  const original = { originalBytes: file.size, compressedBytes: file.size, file };

  if (typeof document === "undefined" || !file.type.startsWith("image/")) {
    return original;
  }

  try {
    const bitmap = await createImageBitmap(file);

    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close();
      return original;
    }

    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
    );

    if (!blob || blob.size >= file.size) {
      // Recodificar não ajudou (imagem já pequena ou muito otimizada)
      return original;
    }

    const baseName = file.name.replace(/\.[^.]+$/, "") || "foto";
    return {
      file: new File([blob], `${baseName}.jpg`, { type: "image/jpeg" }),
      originalBytes: file.size,
      compressedBytes: blob.size,
    };
  } catch {
    return original;
  }
}
