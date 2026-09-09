import { isKeyOwnedByTenant, buildOrderPhotoKey } from "@/lib/file-access";

describe("buildOrderPhotoKey", () => {
  it("coloca o tenant no início da chave", () => {
    expect(buildOrderPhotoKey("tenant-a", "order-1", "abc.jpg")).toBe(
      "t/tenant-a/orders/order-1/abc.jpg"
    );
  });

  it("gera chave que o próprio tenant consegue ler", () => {
    const key = buildOrderPhotoKey("tenant-a", "order-1", "abc.jpg");
    expect(isKeyOwnedByTenant(key, "tenant-a")).toBe(true);
  });
});

describe("isKeyOwnedByTenant", () => {
  it("libera chave do próprio tenant", () => {
    expect(isKeyOwnedByTenant("t/tenant-a/orders/order-1/foto.jpg", "tenant-a")).toBe(true);
  });

  it("recusa chave de outro tenant", () => {
    expect(isKeyOwnedByTenant("t/tenant-b/orders/order-1/foto.jpg", "tenant-a")).toBe(false);
  });

  it("recusa tenant que é prefixo de outro", () => {
    // "tenant-a" não deve casar com "tenant-a2"
    expect(isKeyOwnedByTenant("t/tenant-a2/orders/order-1/foto.jpg", "tenant-a")).toBe(false);
  });

  it("recusa chave no formato legado, sem tenant no caminho", () => {
    expect(isKeyOwnedByTenant("order-1/foto.jpg", "tenant-a")).toBe(false);
  });

  it("recusa travessia de diretório", () => {
    expect(isKeyOwnedByTenant("t/tenant-a/../tenant-b/foto.jpg", "tenant-a")).toBe(false);
    expect(isKeyOwnedByTenant("../../etc/passwd", "tenant-a")).toBe(false);
    expect(isKeyOwnedByTenant("t/tenant-a/./foto.jpg", "tenant-a")).toBe(false);
  });

  it("recusa segmento vazio (barra dupla)", () => {
    expect(isKeyOwnedByTenant("t//orders/foto.jpg", "tenant-a")).toBe(false);
    expect(isKeyOwnedByTenant("t/tenant-a//foto.jpg", "tenant-a")).toBe(false);
  });

  it("recusa a chave que é só o prefixo, sem arquivo", () => {
    expect(isKeyOwnedByTenant("t/tenant-a", "tenant-a")).toBe(false);
    expect(isKeyOwnedByTenant("t/tenant-a/", "tenant-a")).toBe(false);
  });

  it("recusa chave ou tenant vazios", () => {
    expect(isKeyOwnedByTenant("", "tenant-a")).toBe(false);
    expect(isKeyOwnedByTenant("t/tenant-a/orders/order-1/foto.jpg", "")).toBe(false);
  });

  it("recusa tentativa de forjar o prefixo em outro nível", () => {
    expect(isKeyOwnedByTenant("x/t/tenant-a/foto.jpg", "tenant-a")).toBe(false);
  });
});
