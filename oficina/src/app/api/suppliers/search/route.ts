import { NextRequest, NextResponse } from "next/server";
import { handleError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/infrastructure/database/prisma";
import { MercadoLivreAdapter } from "@/infrastructure/marketplace/MercadoLivreAdapter";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const source = searchParams.get("source"); // "meli" | "suppliers" | undefined (ambos)

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ error: "Parâmetro 'q' é obrigatório" }, { status: 400 });
    }

    const results: {
      mercadoLivre: unknown[];
      suppliers: unknown[];
    } = { mercadoLivre: [], suppliers: [] };

    // Busca no Mercado Livre (API pública, sem auth)
    if (!source || source === "meli") {
      try {
        const meli = new MercadoLivreAdapter();
        const meliResults = await meli.search(query.trim(), 8);
        results.mercadoLivre = meliResults.products;
      } catch {
        // Se ML falhar, não bloquear os outros resultados
        results.mercadoLivre = [];
      }
    }

    // Busca em fornecedores cadastrados (com URL de busca customizada)
    if (!source || source === "suppliers") {
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

      const encodedQuery = encodeURIComponent(query.trim());
      results.suppliers = suppliers.flatMap((supplier) =>
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
    }

    return NextResponse.json(results);
  } catch (error) {
    return handleError(error);
  }
}
