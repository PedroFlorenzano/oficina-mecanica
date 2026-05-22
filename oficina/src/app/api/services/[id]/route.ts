import { NextRequest, NextResponse } from "next/server";
import { container } from "@/infrastructure/container";
import { UpdateService } from "@/application/use-cases/services/UpdateService";
import { DeleteService } from "@/application/use-cases/services/DeleteService";
import { handleError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;

    const service = await container.serviceCatalogRepository.findById(id);

    if (!service) {
      return NextResponse.json({ error: "Serviço não encontrado" }, { status: 404 });
    }

    return NextResponse.json(service);
  } catch (error) {
    if (error instanceof Response) return error;
    return handleError(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const useCase = new UpdateService(container.serviceCatalogRepository);
    const service = await useCase.execute(id, body);
    return NextResponse.json(service);
  } catch (error) {
    if (error instanceof Response) return error;
    return handleError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;
    const useCase = new DeleteService(container.serviceCatalogRepository);
    await useCase.execute(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    return handleError(error);
  }
}
