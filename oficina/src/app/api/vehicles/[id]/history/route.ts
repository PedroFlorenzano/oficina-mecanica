import { NextRequest, NextResponse } from "next/server";
import { createContainer } from "@/infrastructure/container";
import { GetVehicleHistory } from "@/application/use-cases/vehicles/GetVehicleHistory";
import { handleError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const container = createContainer(tenantId);
    const { id } = await params;
    const useCase = new GetVehicleHistory(
      container.vehicleRepository,
      container.orderRepository
    );
    const history = await useCase.execute(id, tenantId);
    return NextResponse.json(history);
  } catch (error) {
    if (error instanceof Response) return error;
    return handleError(error);
  }
}
