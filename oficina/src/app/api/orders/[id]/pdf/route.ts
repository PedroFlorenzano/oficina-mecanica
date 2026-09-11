import { NextRequest, NextResponse } from "next/server";
import { createContainer } from "@/infrastructure/container";
import { GenerateOrderPDF } from "@/application/use-cases/orders/GenerateOrderPDF";
import { parseVia } from "@/components/pdf/osVia";
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
    const via = parseVia(request.nextUrl.searchParams.get("via"));
    const useCase = new GenerateOrderPDF(container.orderRepository);
    const buffer = await useCase.execute(id, tenantId, via);
    const order = await container.orderRepository.findById(id);

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="OS-${order?.number ?? id}-${via}.pdf"`,
      },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return handleError(error);
  }
}
