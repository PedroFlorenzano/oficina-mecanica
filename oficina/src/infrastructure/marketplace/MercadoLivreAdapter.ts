/**
 * Adapter para buscar produtos no Mercado Livre via API pública.
 * A API de busca (sites/MLB/search) é pública e não requer autenticação.
 *
 * Para monetização via afiliados:
 * - Mercado Livre usa plataformas como AWIN ou Lomadee
 * - O link pode ser customizado com tracking params
 * - Formato: adicionar "&tracking_id=operare" ou usar redirect de afiliado
 */

const MELI_API_BASE = "https://api.mercadolibre.com";
const SITE_ID = "MLB"; // Brasil

export interface MeliProduct {
  id: string;
  title: string;
  price: number;
  currency: string;
  thumbnail: string;
  permalink: string; // link direto pro produto
  condition: string; // "new" | "used"
  freeShipping: boolean;
  sellerNickname: string;
  sellerReputation: string | null; // "5_green", "4_light_green", etc.
  availableQuantity: number;
}

export interface MeliSearchResult {
  query: string;
  totalResults: number;
  products: MeliProduct[];
}

export class MercadoLivreAdapter {
  private affiliateTag: string;

  constructor(affiliateTag?: string) {
    // Tag de afiliado para rastreamento (configurável)
    this.affiliateTag = affiliateTag || process.env.MELI_AFFILIATE_TAG || "operare";
  }

  /**
   * Busca produtos no Mercado Livre.
   * A API pública não requer autenticação.
   */
  async search(query: string, limit: number = 10): Promise<MeliSearchResult> {
    const url = `${MELI_API_BASE}/sites/${SITE_ID}/search?q=${encodeURIComponent(query)}&limit=${limit}`;

    const res = await fetch(url, {
      headers: { "Accept": "application/json" },
      next: { revalidate: 300 }, // cache 5 min no Next.js
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Mercado Livre API ${res.status}: ${body}`);
    }

    const data = await res.json();

    const products: MeliProduct[] = (data.results || []).map((item: Record<string, unknown>) => ({
      id: item.id as string,
      title: item.title as string,
      price: item.price as number,
      currency: (item.currency_id as string) || "BRL",
      thumbnail: (item.thumbnail as string)?.replace("http://", "https://") || "",
      permalink: this.addAffiliateTracking(item.permalink as string),
      condition: item.condition === "new" ? "Novo" : "Usado",
      freeShipping: !!(item.shipping as Record<string, unknown>)?.free_shipping,
      sellerNickname: (item.seller as Record<string, unknown>)?.nickname as string || "",
      sellerReputation: this.parseReputation(item.seller as Record<string, unknown>),
      availableQuantity: (item.available_quantity as number) || 0,
    }));

    return {
      query,
      totalResults: data.paging?.total || 0,
      products,
    };
  }

  /**
   * Adiciona tag de afiliado/tracking ao link do produto.
   */
  private addAffiliateTracking(permalink: string): string {
    if (!permalink) return "";
    const separator = permalink.includes("?") ? "&" : "?";
    return `${permalink}${separator}tracking_id=${this.affiliateTag}`;
  }

  /**
   * Interpreta a reputação do vendedor.
   */
  private parseReputation(seller: Record<string, unknown> | null): string | null {
    if (!seller) return null;
    const rep = seller.seller_reputation as Record<string, unknown> | undefined;
    if (!rep) return null;
    const levelId = rep.level_id as string | null;
    if (!levelId) return null;

    const levels: Record<string, string> = {
      "5_green": "MercadoLíder",
      "4_light_green": "Boa",
      "3_yellow": "Regular",
      "2_orange": "Baixa",
      "1_red": "Ruim",
    };
    return levels[levelId] || levelId;
  }
}
