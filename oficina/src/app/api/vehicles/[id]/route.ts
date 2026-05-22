import { NextRequest, NextResponse } from "next/server";
import { container } from "@/infrastructure/container";
import { UpdateVehicle } from "@/application/use-cases/vehicles/UpdateVehicle";
import { DeleteVehicle } from "@/application/use-cases/vehicles/DeleteVehicle";
import { handleError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const vehicle = await container.vehicleRepository.findById(id);

    if (!vehicle) {
      return NextResponse.json({ error: "Veículo não encontrado" }, { status: 404 });
    }

    return NextResponse.json(vehicle);
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
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const { id } = await params;
    const body = await request.json();
    const useCase = new UpdateVehicle(container.vehicleRepository);
    const vehicle = await useCase.execute(id, body, tenantId);
    return NextResponse.json(vehicle);
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
    const useCase = new DeleteVehicle(container.vehicleRepository);
    await useCase.execute(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    return handleError(error);
  }
}
