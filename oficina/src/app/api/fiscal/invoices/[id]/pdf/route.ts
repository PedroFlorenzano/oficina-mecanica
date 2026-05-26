import { NextRequest, NextResponse } from "next/server";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { container } from "@/infrastructure/container";
import { handleError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";
import { DanfeDocument, DanfeData } from "@/components/pdf/DanfeDocument";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const invoice = await container.fiscalRepository.findInvoiceById(id, session.user.tenantId);
    if (!invoice) return NextResponse.json({ error: "Nota fiscal não encontrada" }, { status: 404 });
    if (invoice.status !== "AUTHORIZED") return NextResponse.json({ error: "DANFE disponível apenas para notas autorizadas" }, { status: 400 });

    const config = await container.fiscalRepository.getConfig(session.user.tenantId);

    const data: DanfeData = {
      type: invoice.type as "NFE" | "NFSE",
      number: invoice.number!,
      series: invoice.series!,
      accessKey: invoice.accessKey!,
      protocolNumber: invoice.protocolNumber!,
      issueDate: invoice.issueDate!,
      emitter: {
        cnpj: config?.cnpj || "",
        razaoSocial: config?.razaoSocial || "",
        inscricaoEstadual: config?.inscricaoEstadual || null,
        inscricaoMunicipal: config?.inscricaoMunicipal || null,
      },
      client: {
        name: invoice.order?.client?.name || "—",
        document: null,
        phone: null,
      },
      items: (invoice.items || []).map(i => ({
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        totalPrice: i.totalPrice,
        cfop: i.cfop,
        ncm: i.ncm,
        serviceCode: i.serviceCode,
      })),
      totalAmount: invoice.totalAmount,
      orderNumber: invoice.order?.number || 0,
    };

    const element = React.createElement(DanfeDocument, { data }) as unknown as React.ReactElement<import("@react-pdf/renderer").DocumentProps>;
    const buffer = await renderToBuffer(element);

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="danfe-${invoice.number}.pdf"`,
      },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return handleError(error);
  }
}
