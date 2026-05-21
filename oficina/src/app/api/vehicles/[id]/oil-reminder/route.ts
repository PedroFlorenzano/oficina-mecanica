import { NextRequest, NextResponse } from "next/server";
import { container } from "@/infrastructure/container";
import { CheckOilChangeReminder } from "@/application/use-cases/vehicles/CheckOilChangeReminder";
import { handleError } from "@/lib/api-handler";

const DEMO_TENANT_ID = "demo-tenant"; // TODO: integrar com auth

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const useCase = new CheckOilChangeReminder(
      container.vehicleRepository,
      container.orderRepository
    );
    const result = await useCase.execute(id, DEMO_TENANT_ID);
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}
