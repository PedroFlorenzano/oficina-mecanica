import { NextRequest, NextResponse } from "next/server";
import { createContainer } from "@/infrastructure/container";
import { requireAuth } from "@/lib/auth";
import archiver from "archiver";
import { PassThrough } from "stream";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });

    const tenantId = session.user.tenantId;
    const container = createContainer(tenantId);
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const type = searchParams.get("type"); // NFE, NFSE or null (all)

    const invoices = await container.fiscalRepository.findAllInvoices(tenantId, {
      status: "AUTHORIZED",
      type: type || undefined,
    });

    // Filtrar por período
    const filtered = invoices.filter(inv => {
      if (!inv.issueDate) return false;
      const d = new Date(inv.issueDate);
      if (startDate && d < new Date(startDate)) return false;
      if (endDate && d > new Date(endDate + "T23:59:59")) return false;
      return true;
    });

    if (filtered.length === 0) {
      return NextResponse.json({ error: "Nenhuma nota encontrada no período" }, { status: 404 });
    }

    // Gerar ZIP em memória
    const passThrough = new PassThrough();
    const archive = archiver("zip", { zlib: { level: 9 } });
    const chunks: Buffer[] = [];

    passThrough.on("data", (chunk: Buffer) => chunks.push(chunk));

    archive.pipe(passThrough);

    for (const inv of filtered) {
      if (!inv.xmlContent) continue;
      const prefix = inv.type === "NFE" ? "NFe" : "NFSe";
      const num = String(inv.number || "0").padStart(6, "0");
      const fileName = `${prefix}_${num}_${inv.accessKey || inv.id}.xml`;
      archive.append(inv.xmlContent, { name: fileName });
    }

    await archive.finalize();

    // Aguardar fim do stream
    await new Promise<void>((resolve) => passThrough.on("end", resolve));

    const zipBuffer = Buffer.concat(chunks);
    const month = startDate ? startDate.substring(0, 7) : new Date().toISOString().substring(0, 7);

    return new NextResponse(zipBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="XMLs_Fiscais_${month}.zip"`,
        "Content-Length": String(zipBuffer.length),
      },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
