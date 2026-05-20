import { NextRequest, NextResponse } from "next/server";
import { container } from "@/infrastructure/container";
import { CreateVehicle } from "@/application/use-cases/vehicles/CreateVehicle";
import { handleError } from "@/lib/api-handler";

const DEMO_TENANT_ID = "demo-tenant";

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.get("search") || "";

  const vehicles = search
    ? await container.vehicleRepository.search(search, DEMO_TENANT_ID)
    : await container.vehicleRepository.findAll(DEMO_TENANT_ID);

  return NextResponse.json(vehicles);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const useCase = new CreateVehicle(container.vehicleRepository);
    const vehicle = await useCase.execute(body, DEMO_TENANT_ID);
    return NextResponse.json(vehicle, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
