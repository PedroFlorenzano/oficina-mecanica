"use client";

import { useState } from "react";
import { Search, ExternalLink, Truck, Loader2, ShoppingCart, Star } from "lucide-react";

interface MeliProduct {
  id: string;
  title: string;
  price: number;
  currency: string;
  thumbnail: string;
  permalink: string;
  condition: string;
  freeShipping: boolean;
  sellerNickname: string;
  sellerReputation: string | null;
}

interface SupplierResult {
  supplierId: string;
  supplierName: string;
  searchUrl: string;
  defaultLeadDays: number;
  website: string | null;
}

interface SearchResults {
  mercadoLivre: MeliProduct[];
  suppliers: SupplierResult[];
}

interface SupplierSearchProps {
  orderId?: string;
  initialQuery?: string;
}

export function SupplierSearch({ orderId, initialQuery = "" }: SupplierSearchProps) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [activeTab, setActiveTab] = useState<"meli" | "suppliers">("meli");

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/suppliers/search?q=${encodeURIComponent(query.trim())}`);
      if (res.ok) {
        setResults(await res.json());
      } else {
        setResults({ mercadoLivre: [], suppliers: [] });
      }
    } catch {
      setResults({ mercadoLivre: [], suppliers: [] });
    }
    setLoading(false);
  };

  const handleMeliClick = async (product: MeliProduct) => {
    // Registrar clique
    await fetch("/api/suppliers/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplierId: "mercadolivre",
        searchQuery: query.trim(),
        productUrl: product.permalink,
        orderId: orderId || null,
      }),
    }).catch(() => {});
    window.open(product.permalink, "_blank", "noopener,noreferrer");
  };

  const handleSupplierClick = async (result: SupplierResult) => {
    await fetch("/api/suppliers/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplierId: result.supplierId,
        searchQuery: query.trim(),
        productUrl: result.searchUrl,
        orderId: orderId || null,
      }),
    }).catch(() => {});
    window.open(result.searchUrl, "_blank", "noopener,noreferrer");
  };

  const formatPrice = (price: number) =>
    price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-3">
      {/* Barra de busca */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Ex: amortecedor peugeot 2008, pastilha freio civic..."
            className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          Buscar
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-8 text-slate-500 text-sm">
          <Loader2 size={24} className="animate-spin mx-auto mb-2" />
          Buscando produtos...
        </div>
      )}

      {/* Sem resultados */}
      {!loading && searched && results && results.mercadoLivre.length === 0 && results.suppliers.length === 0 && (
        <div className="text-center py-8">
          <ShoppingCart size={32} className="mx-auto text-slate-300 mb-2" />
          <p className="text-sm text-slate-500">Nenhum produto encontrado</p>
          <p className="text-xs text-slate-400 mt-1">Tente termos mais específicos (ex: marca + modelo + ano)</p>
        </div>
      )}

      {/* Resultados */}
      {!loading && results && (results.mercadoLivre.length > 0 || results.suppliers.length > 0) && (
        <>
          {/* Tabs */}
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab("meli")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "meli"
                  ? "border-yellow-500 text-yellow-700"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <ShoppingCart size={14} />
                Mercado Livre ({results.mercadoLivre.length})
              </span>
            </button>
            {results.suppliers.length > 0 && (
              <button
                onClick={() => setActiveTab("suppliers")}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "suppliers"
                    ? "border-blue-500 text-blue-700"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Truck size={14} />
                  Fornecedores ({results.suppliers.length})
                </span>
              </button>
            )}
          </div>

          {/* Tab: Mercado Livre */}
          {activeTab === "meli" && (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {results.mercadoLivre.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => handleMeliClick(product)}
                >
                  {/* Thumbnail */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={product.thumbnail}
                    alt={product.title}
                    className="w-14 h-14 object-contain rounded border border-slate-100 bg-white flex-shrink-0"
                  />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-800 font-medium line-clamp-2 leading-tight">
                      {product.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-base font-bold text-green-700">
                        {formatPrice(product.price)}
                      </span>
                      {product.freeShipping && (
                        <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">
                          Frete grátis
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400">
                        {product.condition}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-400">{product.sellerNickname}</span>
                      {product.sellerReputation && (
                        <span className="text-[10px] flex items-center gap-0.5 text-amber-600">
                          <Star size={9} fill="currentColor" /> {product.sellerReputation}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* CTA */}
                  <ExternalLink size={16} className="text-slate-400 flex-shrink-0" />
                </div>
              ))}
            </div>
          )}

          {/* Tab: Fornecedores */}
          {activeTab === "suppliers" && (
            <div className="border border-slate-200 rounded-lg divide-y">
              {results.suppliers.map((result, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{result.supplierName}</p>
                    <p className="text-xs text-slate-500">
                      Prazo: {result.defaultLeadDays} dia(s) úteis
                    </p>
                  </div>
                  <button
                    onClick={() => handleSupplierClick(result)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100"
                  >
                    <ExternalLink size={12} />
                    Abrir loja
                  </button>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-slate-400 text-center">
            Ao clicar, você será redirecionado para o site. Links de afiliado podem gerar comissão para a plataforma.
          </p>
        </>
      )}
    </div>
  );
}
