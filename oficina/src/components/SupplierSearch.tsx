"use client";

import { useState } from "react";
import { Search, ExternalLink, Truck, Loader2 } from "lucide-react";

interface SupplierResult {
  supplierId: string;
  supplierName: string;
  searchUrl: string;
  defaultLeadDays: number;
  website: string | null;
}

interface SupplierSearchProps {
  orderId?: string;
  initialQuery?: string;
}

export function SupplierSearch({ orderId, initialQuery = "" }: SupplierSearchProps) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SupplierResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/suppliers/search?q=${encodeURIComponent(query.trim())}`);
      if (res.ok) {
        setResults(await res.json());
      } else {
        setResults([]);
      }
    } catch {
      setResults([]);
    }
    setLoading(false);
  };

  const handleClick = async (result: SupplierResult) => {
    // Registrar clique antes de abrir
    await fetch("/api/suppliers/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplierId: result.supplierId,
        searchQuery: query.trim(),
        productUrl: result.searchUrl,
        orderId: orderId || null,
      }),
    }).catch(() => {}); // não bloquear se falhar

    // Abrir loja em nova aba
    window.open(result.searchUrl, "_blank", "noopener,noreferrer");
  };

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
            placeholder="Buscar peça... (ex: pastilha freio Civic 2020)"
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          Buscar
        </button>
      </div>

      {/* Resultados */}
      {loading && (
        <div className="text-center py-6 text-slate-500 text-sm">
          <Loader2 size={20} className="animate-spin mx-auto mb-2" />
          Buscando fornecedores...
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="text-center py-6">
          <Truck size={32} className="mx-auto text-slate-300 mb-2" />
          <p className="text-sm text-slate-500">Nenhum fornecedor com URL de busca configurada</p>
          <p className="text-xs text-slate-400 mt-1">Configure URLs de busca no cadastro de fornecedores</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="border border-slate-200 rounded-lg divide-y">
          {results.map((result, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50">
              <div>
                <p className="text-sm font-medium text-slate-800">{result.supplierName}</p>
                <p className="text-xs text-slate-500">
                  Prazo: {result.defaultLeadDays} dia(s) úteis
                  {result.website && <span className="ml-2">• {new URL(result.website).hostname}</span>}
                </p>
              </div>
              <button
                onClick={() => handleClick(result)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 text-green-700 rounded-lg text-xs font-medium hover:bg-green-100 transition-colors"
              >
                <ExternalLink size={12} />
                Abrir loja
              </button>
            </div>
          ))}
        </div>
      )}

      {!loading && results.length > 0 && (
        <p className="text-xs text-slate-400 text-center">
          Ao clicar, você será redirecionado para o site do fornecedor. O clique é registrado para controle.
        </p>
      )}
    </div>
  );
}
