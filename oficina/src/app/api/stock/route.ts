import { NextRequest, NextResponse } from "next/server";
import { createContainer } from "@/infrastructure/container";
import { CreateStockItem } from "@/application/use-cases/stock/CreateStockItem";
import { SearchPartsByVehicle } from "@/application/use-cases/stock/SearchPartsByVehicle";
import { handleError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const container = createContainer(tenantId);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim();
    const plate = searchParams.get("plate")?.trim();
    const vehicleId = searchParams.get("vehicleId")?.trim();

    // Busca de peças compatíveis com um veículo (placa, id ou marca/modelo)
    if (plate || vehicleId) {
      const useCase = new SearchPartsByVehicle(
        container.stockItemRepository,
        container.vehicleRepository
      );
      const result = await useCase.execute({ plate, vehicleId }, tenantId);
      return NextResponse.json(result);
    }

    const items = search
      ? await container.stockItemRepository.search(search, tenantId)
      : await container.stockItemRepository.findAll(tenantId);

    return NextResponse.json(items);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const container = createContainer(tenantId);

    const body = await request.json();
    const useCase = new CreateStockItem(container.stockItemRepository);
    const item = await useCase.execute(body, tenantId);
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
