import { NextRequest, NextResponse } from "next/server";
import { container } from "@/infrastructure/container";
import { UpdateVehicle } from "@/application/use-cases/vehicles/UpdateVehicle";
import { DeleteVehicle } from "@/application/use-cases/vehicles/DeleteVehicle";
import { handleError } from "@/lib/api-handler";

const DEMO_TENANT_ID = "demo-tenant";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const vehicle = await container.vehicleRepository.findById(id);

  if (!vehicle) {
    return NextResponse.json({ error: "Veículo não encontrado" }, { status: 404 });
  }

  return NextResponse.json(vehicle);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const useCase = new UpdateVehicle(container.vehicleRepository);
    const vehicle = await useCase.execute(id, body, DEMO_TENANT_ID);
    return NextResponse.json(vehicle);
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const useCase = new DeleteVehicle(container.vehicleRepository);
    await useCase.execute(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error);
  }
}
