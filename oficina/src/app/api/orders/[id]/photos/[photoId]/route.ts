import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createContainer } from "@/infrastructure/container";
import { handleError } from "@/lib/api-handler";
import { DeleteOrderPhoto } from "@/application/use-cases/photos/DeleteOrderPhoto";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  try {
    const session = await requireAuth();
    const { photoId } = await params;
    const container = createContainer(session.user.tenantId);

    const useCase = new DeleteOrderPhoto(container.orderPhotoRepository);
    await useCase.execute(photoId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error);
  }
}
