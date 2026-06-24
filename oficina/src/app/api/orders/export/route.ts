import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { handleError } from "@/lib/api-handler";
import { prisma } from "@/infrastructure/database/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const { searchParams } = new URL(request.url);

    const ids = searchParams.getAll("ids");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: Record<string, unknown> = { tenantId };
    if (ids.length > 0) where.id = { in: ids };
    if (startDate || endDate) {
      where.createdAt = {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate + "T23:59:59.999Z") }),
      };
    }

    const orders = await prisma.serviceOrder.findMany({
      where,
      orderBy: { number: "asc" },
      include: {
        client: { select: { name: true, document: true } },
        vehicle: { select: { plate: true, brand: true, model: true } },
        services: { select: { description: true, price: true } },
        parts: { select: { description: true, quantity: true, unitPrice: true, totalPrice: true } },
      },
    });

    const BOM = "\uFEFF";
    const header = "Nº;Status;Cliente;Documento;Placa;Veículo;KM;Serviços;Peças;Total;Data Abertura\n";
    const rows = orders.map((o) => {
      const services = o.services.map(s => s.description).join(" | ");
      const parts = o.parts.map(p => `${p.description} (${p.quantity}x)`).join(" | ");
      const statusMap: Record<string, string> = {
        OPEN: "Aberta", IN_PROGRESS: "Em Execução", WAITING_PART: "Aguardando Peça",
        WAITING_APPROVAL: "Aguardando Aprovação", COMPLETED: "Concluída", DELIVERED: "Entregue", CANCELLED: "Cancelada",
      };
      return [
        o.number,
        statusMap[o.status] || o.status,
        o.client.name,
        o.client.document,
        o.vehicle.plate,
        `${o.vehicle.brand} ${o.vehicle.model}`,
        o.mileage,
        `"${services}"`,
        `"${parts}"`,
        o.totalAmount.toFixed(2).replace(".", ","),
        new Date(o.createdAt).toLocaleDateString("pt-BR"),
      ].join(";");
    }).join("\n");

    return new NextResponse(BOM + header + rows, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="ordens-servico-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return handleError(error);
  }
}
