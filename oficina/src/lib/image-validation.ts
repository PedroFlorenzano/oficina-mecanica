/**
 * Detecção de tipo de imagem pelos bytes iniciais (magic numbers).
 *
 * Motivo: o `Content-Type` que chega no upload vem do navegador e é escolhido
 * pelo cliente, então é falsificável. Renomear `payload.html` para `foto.jpg`
 * basta para o tipo declarado virar `image/jpeg`. Aqui olhamos o conteúdo.
 */

export type ImageMimeType = "image/jpeg" | "image/png" | "image/webp";

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function startsWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  if (bytes.length < offset + signature.length) {
    return false;
  }
  return signature.every((byte, index) => bytes[offset + index] === byte);
}

/**
 * Retorna o MIME real da imagem, ou null se não for JPEG, PNG ou WebP.
 */
export function detectImageMimeType(bytes: Uint8Array): ImageMimeType | null {
  // JPEG: começa com FF D8 FF
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) {
    return "image/jpeg";
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (startsWith(bytes, PNG_SIGNATURE)) {
    return "image/png";
  }

  // WebP: "RIFF" (0-3) + "WEBP" (8-11)
  if (
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return "image/webp";
  }

  return null;
}

/** Extensão canônica para cada tipo aceito. */
export function extensionFor(mimeType: ImageMimeType): string {
  return mimeType === "image/jpeg" ? "jpg" : mimeType === "image/png" ? "png" : "webp";
}
