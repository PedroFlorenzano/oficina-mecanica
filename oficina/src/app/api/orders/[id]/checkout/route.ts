import { NextRequest, NextResponse } from "next/server";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { createContainer } from "@/infrastructure/container";
import { requireAuth } from "@/lib/auth";
import { handleError } from "@/lib/api-handler";
import CheckoutDocument from "@/components/pdf/CheckoutDocument";

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
    const tenant = await prismaAdmin.tenant.findUnique({
      where: { id: session.user.tenantId },
      select: { name: true },
    });

    // Extrair serviços da OS (sem valores)
    const services: string[] = [];
    if (order.complaints && Array.isArray(order.complaints)) {
      for (const complaint of order.complaints) {
        // Adicionar a reclamação como contexto
        const c = complaint as { description?: string; services?: Array<{ description?: string; name?: string }> };
        if (c.services && Array.isArray(c.services)) {
          for (const svc of c.services) {
            const desc = svc.description || svc.name || "";
            if (desc) services.push(desc);
          }
        }
      }
    }

    const data = {
      orderNumber: order.number,
      date: new Date().toLocaleDateString("pt-BR"),
      client: { name: order.client.name },
      vehicle: {
        plate: order.vehicle.plate,
        brand: order.vehicle.brand,
        model: order.vehicle.model,
        year: (order.vehicle as { year?: number }).year || 0,
        color: (order.vehicle as { color?: string | null }).color || null,
      },
      services,
      shopName: tenant?.name || "Oficina",
    };

    const element = React.createElement(CheckoutDocument, { data }) as unknown as React.ReactElement<import("@react-pdf/renderer").DocumentProps>;
    const buffer = await renderToBuffer(element);
    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="checkout-os-${order.number}.pdf"`,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
