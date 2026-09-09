import { detectImageMimeType, extensionFor } from "@/lib/image-validation";

const bytes = (...values: number[]) => new Uint8Array(values);

describe("detectImageMimeType", () => {
  it("reconhece JPEG pela assinatura FF D8 FF", () => {
    expect(detectImageMimeType(bytes(0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10))).toBe("image/jpeg");
  });

  it("reconhece PNG pela assinatura completa", () => {
    expect(
      detectImageMimeType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00))
    ).toBe("image/png");
  });

  it("reconhece WebP por RIFF + WEBP", () => {
    const webp = bytes(
      0x52, 0x49, 0x46, 0x46, // RIFF
      0x24, 0x00, 0x00, 0x00, // tamanho
      0x57, 0x45, 0x42, 0x50  // WEBP
    );
    expect(detectImageMimeType(webp)).toBe("image/webp");
  });

  it("recusa RIFF que não é WebP (ex: WAV)", () => {
    const wav = bytes(
      0x52, 0x49, 0x46, 0x46,
      0x24, 0x00, 0x00, 0x00,
      0x57, 0x41, 0x56, 0x45 // WAVE
    );
    expect(detectImageMimeType(wav)).toBeNull();
  });

  it("recusa PDF disfarçado de imagem", () => {
    expect(detectImageMimeType(bytes(0x25, 0x50, 0x44, 0x46, 0x2d))).toBeNull();
  });

  it("recusa HTML, que é o caso perigoso de arquivo renomeado", () => {
    // "<html>" — se servido como imagem por um proxy permissivo, viraria XSS
    expect(detectImageMimeType(bytes(0x3c, 0x68, 0x74, 0x6d, 0x6c, 0x3e))).toBeNull();
  });

  it("recusa SVG, que aceita script embutido", () => {
    expect(detectImageMimeType(bytes(0x3c, 0x73, 0x76, 0x67))).toBeNull();
  });

  it("recusa arquivo vazio ou truncado", () => {
    expect(detectImageMimeType(bytes())).toBeNull();
    expect(detectImageMimeType(bytes(0xff, 0xd8))).toBeNull();
    expect(detectImageMimeType(bytes(0x89, 0x50, 0x4e))).toBeNull();
  });
});

describe("extensionFor", () => {
  it("mapeia cada tipo aceito para sua extensão", () => {
    expect(extensionFor("image/jpeg")).toBe("jpg");
    expect(extensionFor("image/png")).toBe("png");
    expect(extensionFor("image/webp")).toBe("webp");
  });
});
