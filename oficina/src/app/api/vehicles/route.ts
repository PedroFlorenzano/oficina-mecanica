import { NextRequest, NextResponse } from "next/server";
import { container } from "@/infrastructure/container";
import { CreateVehicle } from "@/application/use-cases/vehicles/CreateVehicle";
import { handleError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;

    const search = request.nextUrl.searchParams.get("search") || "";

    const vehicles = search
      ? await container.vehicleRepository.search(search, tenantId)
      : await container.vehicleRepository.findAll(tenantId);

    return NextResponse.json(vehicles);
  } catch (error) {
    if (error instanceof Response) return error;
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;

    const body = await request.json();
    const useCase = new CreateVehicle(container.vehicleRepository);
    const vehicle = await useCase.execute(body, tenantId);
    return NextResponse.json(vehicle, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    return handleError(error);
  }
}
