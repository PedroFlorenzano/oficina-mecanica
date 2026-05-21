import { NextRequest, NextResponse } from "next/server";
import { container } from "@/infrastructure/container";
import { GetClientHistory } from "@/application/use-cases/clients/GetClientHistory";
import { handleError } from "@/lib/api-handler";

const DEMO_TENANT_ID = "demo-tenant"; // TODO: integrar com auth

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const useCase = new GetClientHistory(
      container.clientRepository,
      container.orderRepository
    );
    const history = await useCase.execute(id, DEMO_TENANT_ID);
    return NextResponse.json(history);
  } catch (error) {
    return handleError(error);
  }
}
