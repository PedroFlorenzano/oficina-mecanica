import { NextRequest, NextResponse } from "next/server";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { createContainer } from "@/infrastructure/container";
import { requireAuth } from "@/lib/auth";
import { handleError } from "@/lib/api-handler";
import ChecklistDocument from "@/components/pdf/ChecklistDocument";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const container = createContainer(session.user.tenantId);
    const { id } = await params;

    const order = await container.orderRepository.findById(id);
    if (!order) return NextResponse.json({ error: "OS não encontrada" }, { status: 404 });

    // Buscar nome da oficina (tenant)
    const { prismaAdmin } = await import("@/infrastructure/database/prisma");
    const tenant = await prismaAdmin.tenant.findUnique({ where: { id: session.user.tenantId }, select: { name: true } });

    const data = {
      orderNumber: order.number,
      date: new Date(order.createdAt).toLocaleDateString("pt-BR"),
      client: { name: order.client.name, document: order.client.document, phone: order.client.phone },
      vehicle: { plate: order.vehicle.plate, brand: order.vehicle.brand, model: order.vehicle.model, year: (order.vehicle as { year?: number }).year || 0, color: (order.vehicle as { color?: string | null }).color || null },
      mileage: order.mileage,
      shopName: tenant?.name || "Oficina",
    };

    const element = React.createElement(ChecklistDocument, { data }) as unknown as React.ReactElement<import("@react-pdf/renderer").DocumentProps>;
    const buffer = await renderToBuffer(element);
    return new NextResponse(buffer as unknown as BodyInit, {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="checklist-os-${order.number}.pdf"` },
    });
  } catch (error) {
    return handleError(error);
  }
}
