import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createContainer } from "@/infrastructure/container";
import { handleError } from "@/lib/api-handler";
import { UploadOrderPhoto } from "@/application/use-cases/photos/UploadOrderPhoto";
import { getFileStorage } from "@/infrastructure/storage";
import { detectImageMimeType, extensionFor } from "@/lib/image-validation";
import { randomUUID } from "crypto";

/**
 * Limite de 4 MB. Funções serverless na Vercel recusam corpos acima de ~4,5 MB
 * antes de a requisição chegar aqui, então aceitar mais seria enganoso: o
 * cliente comprime a imagem antes de enviar (veja OrderPhotos.tsx).
 */
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

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
    const tenantId = session.user.tenantId;
    const container = createContainer(tenantId);

    // Garante que a OS existe e pertence a este tenant antes de gravar arquivo.
    // A comparação é explícita porque findById() não recebe tenantId: o
    // isolamento dependeria do RLS, que hoje não está ativo em produção.
    const order = await container.orderRepository.findById(orderId);
    if (!order || order.tenantId !== tenantId) {
      return NextResponse.json({ error: "Ordem de serviço não encontrada" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const category = formData.get("category") as string;
    const description = formData.get("description") as string | null;

    if (!file) {
      return NextResponse.json({ error: "Arquivo é obrigatório" }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "Imagem muito grande. Máximo permitido: 4MB." },
        { status: 413 }
      );
    }

    const content = new Uint8Array(await file.arrayBuffer());

    // Confia no conteúdo, não no tipo declarado pelo navegador
    const mimeType = detectImageMimeType(content);
    if (!mimeType) {
      return NextResponse.json(
        { error: "Arquivo não é uma imagem válida. Use JPEG, PNG ou WebP." },
        { status: 400 }
      );
    }

    // Tenant no início da chave: permite que a leitura barre acesso cruzado
    const key = `t/${tenantId}/orders/${orderId}/${randomUUID()}.${extensionFor(mimeType)}`;
    await getFileStorage().save(key, content, mimeType);

    const useCase = new UploadOrderPhoto(container.orderPhotoRepository);
    const photo = await useCase.execute(
      {
        orderId,
        category: category as "BEFORE" | "AFTER" | "DAMAGE",
        description: description || undefined,
        filePath: key,
        fileName: file.name,
        mimeType,
        sizeBytes: content.byteLength,
      },
      session.user.userId
    );

    return NextResponse.json(photo, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
