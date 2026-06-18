"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, ClipboardList, Users, Car, X } from "lucide-react";

interface SearchResult {
  type: "order" | "client" | "vehicle";
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    else { setQuery(""); setResults([]); }
  }, [open]);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const [ordersRes, clientsRes, vehiclesRes] = await Promise.all([
        fetch(`/api/orders?search=${encodeURIComponent(q)}&pageSize=5`).then(r => r.json()),
        fetch(`/api/clients?search=${encodeURIComponent(q)}`).then(r => r.json()),
        fetch(`/api/vehicles?search=${encodeURIComponent(q)}`).then(r => r.json()),
      ]);
      const items: SearchResult[] = [];
      const orders = Array.isArray(ordersRes) ? ordersRes : ordersRes.data || [];
      orders.slice(0, 5).forEach((o: { id: string; number: number; client: { name: string }; vehicle: { plate: string } }) => {
        items.push({ type: "order", id: o.id, title: `OS #${o.number}`, subtitle: `${o.client.name} · ${o.vehicle.plate}`, href: `/dashboard/orders/${o.id}` });
      });
      (clientsRes as { id: string; name: string; document: string }[]).slice(0, 5).forEach((c) => {
        items.push({ type: "client", id: c.id, title: c.name, subtitle: c.document, href: `/dashboard/clients` });
      });
      (vehiclesRes as { id: string; plate: string; model: string; brand: string }[]).slice(0, 5).forEach((v) => {
        items.push({ type: "vehicle", id: v.id, title: v.plate, subtitle: `${v.brand} ${v.model}`, href: `/dashboard/vehicles` });
      });
      setResults(items);
    } catch { setResults([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => search(query), 300);
    return () => clearTimeout(timer);
  }, [query, search]);

  const icons = { order: ClipboardList, client: Users, vehicle: Car };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={() => setOpen(false)}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 border-b">
          <Search size={18} className="text-slate-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar OS, cliente ou placa..."
            className="flex-1 text-sm outline-none placeholder:text-slate-400"
          />
          <kbd className="text-xs text-slate-400 border border-slate-200 rounded px-1.5 py-0.5">ESC</kbd>
          <button onClick={() => setOpen(false)}><X size={16} className="text-slate-400" /></button>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {loading && <p className="p-4 text-sm text-slate-500">Buscando...</p>}
          {!loading && query.length >= 2 && results.length === 0 && (
            <p className="p-4 text-sm text-slate-500">Nenhum resultado encontrado.</p>
          )}
          {results.map((r) => {
            const Icon = icons[r.type];
            return (
              <button
                key={`${r.type}-${r.id}`}
                onClick={() => { router.push(r.href); setOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left transition-colors"
              >
                <Icon size={16} className="text-slate-400 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-slate-800">{r.title}</p>
                  <p className="text-xs text-slate-500">{r.subtitle}</p>
                </div>
              </button>
            );
          })}
        </div>
        {!query && (
          <div className="px-4 py-3 border-t bg-slate-50 text-xs text-slate-400">
            Dica: use Ctrl+K a qualquer momento para buscar
          </div>
        )}
      </div>
    </div>
  );
}
