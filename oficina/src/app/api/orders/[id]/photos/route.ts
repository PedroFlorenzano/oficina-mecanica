import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createContainer } from "@/infrastructure/container";
import { handleError } from "@/lib/api-handler";
import { UploadOrderPhoto } from "@/application/use-cases/photos/UploadOrderPhoto";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const container = createContainer(session.user.tenantId);
    const photos = await container.orderPhotoRepository.findByOrderId(id);
    return NextResponse.json(photos);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id: orderId } = await params;
    const container = createContainer(session.user.tenantId);

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const category = formData.get("category") as string;
    const description = formData.get("description") as string | null;

    if (!file) {
      return NextResponse.json({ error: "Arquivo é obrigatório" }, { status: 400 });
    }

    // Save file to disk
    const ext = file.name.split(".").pop() || "jpg";
    const fileName = `${randomUUID()}.${ext}`;
    const relativePath = `${orderId}/${fileName}`;
    const uploadDir = join(process.cwd(), "uploads", orderId);
    await mkdir(uploadDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(join(uploadDir, fileName), buffer);

    const useCase = new UploadOrderPhoto(container.orderPhotoRepository);
    const photo = await useCase.execute(
      {
        orderId,
        category: category as "BEFORE" | "AFTER" | "DAMAGE",
        description: description || undefined,
        filePath: relativePath,
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      },
      session.user.userId
    );

    return NextResponse.json(photo, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
