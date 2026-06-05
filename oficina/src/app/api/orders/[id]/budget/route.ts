import { NextRequest, NextResponse } from "next/server";
import { createContainer } from "@/infrastructure/container";
import { handleError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { BudgetDocument } from "@/components/pdf/BudgetDocument";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const container = createContainer(tenantId);
    const { id } = await params;
    const order = await container.orderRepository.findById(id);
    if (!order || order.tenantId !== tenantId) {
      return NextResponse.json({ error: "OS não encontrada" }, { status: 404 });
    }
    const element = React.createElement(BudgetDocument, { order }) as unknown as React.ReactElement<import("@react-pdf/renderer").DocumentProps>;
    const buffer = await renderToBuffer(element);
    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="Orcamento-${order.number}.pdf"`,
      },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return handleError(error);
  }
}
