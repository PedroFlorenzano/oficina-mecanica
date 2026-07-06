import { NextRequest, NextResponse } from "next/server";
import { handleError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/infrastructure/database/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ error: "Parâmetro 'q' é obrigatório" }, { status: 400 });
    }

    // Buscar fornecedores ativos do tenant que têm searchConfig ativa
    const suppliers = await prisma.supplier.findMany({
      where: {
        tenantId,
        active: true,
        searchConfigs: { some: { active: true } },
      },
      include: {
        searchConfigs: { where: { active: true } },
      },
      orderBy: { name: "asc" },
    });

    // Montar URLs de busca
    const encodedQuery = encodeURIComponent(query.trim());
    const results = suppliers.flatMap((supplier) =>
      supplier.searchConfigs.map((config) => ({
        supplierId: supplier.id,
        supplierName: supplier.name,
        searchUrl: config.searchUrlTemplate
          .replace("{query}", encodedQuery)
          .replace("{code}", supplier.affiliateCode || "operare"),
        defaultLeadDays: supplier.defaultLeadTimeDays,
        website: supplier.website,
      }))
    );

    return NextResponse.json(results);
  } catch (error) {
    return handleError(error);
  }
}
