import { UploadOrderPhoto } from "@/application/use-cases/photos/UploadOrderPhoto";
import { DeleteOrderPhoto } from "@/application/use-cases/photos/DeleteOrderPhoto";
import { IOrderPhotoRepository, OrderPhoto } from "@/domain/repositories/IOrderPhotoRepository";
import { ValidationError, NotFoundError } from "@/domain/errors/DomainError";
import { unlink } from "fs/promises";

jest.mock("fs/promises", () => ({
  unlink: jest.fn().mockResolvedValue(undefined),
}));

const mockedUnlink = unlink as jest.MockedFunction<typeof unlink>;

const makePhoto = (overrides: Partial<OrderPhoto> = {}): OrderPhoto => ({
  id: "photo-1",
  orderId: "order-1",
  category: "BEFORE",
  description: "Dano no para-choque",
  filePath: "cmq0y8y8q/photo1.jpg",
  fileName: "photo1.jpg",
  mimeType: "image/jpeg",
  sizeBytes: 500000,
  uploadedById: "user-1",
  createdAt: new Date(),
  ...overrides,
});

const makeRepo = (photo: OrderPhoto | null = makePhoto()): IOrderPhotoRepository => ({
  create: jest.fn().mockImplementation((data) => Promise.resolve({ id: "photo-new", createdAt: new Date(), ...data })),
  findByOrderId: jest.fn().mockResolvedValue([]),
  findById: jest.fn().mockResolvedValue(photo),
  delete: jest.fn().mockResolvedValue(undefined),
});

describe("UploadOrderPhoto", () => {
  const validInput = {
    orderId: "order-1",
    category: "BEFORE" as const,
    description: "Foto do dano",
    filePath: "uploads/photo.jpg",
    fileName: "photo.jpg",
    mimeType: "image/jpeg",
    sizeBytes: 500000,
  };

  it("deve fazer upload com dados válidos", async () => {
    const repo = makeRepo();
    const useCase = new UploadOrderPhoto(repo);

    const result = await useCase.execute(validInput, "user-1");

    expect(result.id).toBe("photo-new");
    expect(result.category).toBe("BEFORE");
    expect(repo.create).toHaveBeenCalled();
  });

  it("deve aceitar todas as categorias válidas", async () => {
    const repo = makeRepo();
    const useCase = new UploadOrderPhoto(repo);

    for (const category of ["BEFORE", "AFTER", "DAMAGE"] as const) {
      const result = await useCase.execute({ ...validInput, category }, "user-1");
      expect(result.category).toBe(category);
    }
  });

  it("deve lançar ValidationError se tipo MIME inválido", async () => {
    const repo = makeRepo();
    const useCase = new UploadOrderPhoto(repo);

    await expect(
      useCase.execute({ ...validInput, mimeType: "application/pdf" }, "user-1")
    ).rejects.toThrow(ValidationError);
  });

  it("deve lançar ValidationError se arquivo muito grande (>10MB)", async () => {
    const repo = makeRepo();
    const useCase = new UploadOrderPhoto(repo);

    await expect(
      useCase.execute({ ...validInput, sizeBytes: 11 * 1024 * 1024 }, "user-1")
    ).rejects.toThrow(ValidationError);
  });

  it("deve lançar ValidationError se fileName vazio", async () => {
    const repo = makeRepo();
    const useCase = new UploadOrderPhoto(repo);

    await expect(
      useCase.execute({ ...validInput, fileName: "  " }, "user-1")
    ).rejects.toThrow(ValidationError);
  });

  it("deve aceitar image/png", async () => {
    const repo = makeRepo();
    const useCase = new UploadOrderPhoto(repo);

    const result = await useCase.execute({ ...validInput, mimeType: "image/png" }, "user-1");
    expect(result.mimeType).toBe("image/png");
  });

  it("deve aceitar image/webp", async () => {
    const repo = makeRepo();
    const useCase = new UploadOrderPhoto(repo);

    const result = await useCase.execute({ ...validInput, mimeType: "image/webp" }, "user-1");
    expect(result.mimeType).toBe("image/webp");
  });

  it("deve tratar description vazia como null", async () => {
    const repo = makeRepo();
    const useCase = new UploadOrderPhoto(repo);

    await useCase.execute({ ...validInput, description: "" }, "user-1");

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ description: null })
    );
  });

  it("deve aceitar arquivo no limite exato (10MB)", async () => {
    const repo = makeRepo();
    const useCase = new UploadOrderPhoto(repo);

    const result = await useCase.execute({ ...validInput, sizeBytes: 10 * 1024 * 1024 }, "user-1");
    expect(result).toBeDefined();
  });
});

describe("DeleteOrderPhoto", () => {
  it("deve deletar foto existente", async () => {
    const repo = makeRepo();
    const useCase = new DeleteOrderPhoto(repo);

    await useCase.execute("photo-1");

    expect(repo.delete).toHaveBeenCalledWith("photo-1");
  });

  it("deve lançar NotFoundError se foto não existe", async () => {
    const repo = makeRepo(null);
    const useCase = new DeleteOrderPhoto(repo);

    await expect(useCase.execute("inexistente")).rejects.toThrow(NotFoundError);
  });

  it("deve prosseguir com delete no DB mesmo se arquivo não existe no disco", async () => {
    mockedUnlink.mockRejectedValueOnce(new Error("ENOENT"));

    const repo = makeRepo();
    const useCase = new DeleteOrderPhoto(repo);

    await useCase.execute("photo-1");

    expect(repo.delete).toHaveBeenCalledWith("photo-1");
  });
});
