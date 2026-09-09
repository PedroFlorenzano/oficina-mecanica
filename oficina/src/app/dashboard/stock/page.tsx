"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Plus, Package, AlertTriangle, Pencil, Trash2, Search, X } from "lucide-react";
import StockItemForm from "./StockItemForm";
import { formatCurrency } from "@/lib/format";
import { hasPermission, parseCustomPermissions, Role } from "@/lib/permissions";

interface StockItem {
  id: string;
  code: string;
  originalCode: string | null;
  sku: string | null;
  barcode: string | null;
  description: string;
  application: string | null;
  observations: string | null;
  brand: string | null;
  unit: string;
  quantity: number;
  minQuantity: number;
  costPrice: number;
  sellPrice: number;
  profitMargin: number | null;
  location: string | null;
  supplierId: string | null;
  leadTimeDays: number | null;
  active: boolean;
}

export default function StockPage() {
  const { data: session } = useSession();
  const role = (session?.user?.role ?? "MECHANIC") as Role;
  const perms = parseCustomPermissions(session?.user?.customPermissions);
  const canCreate = hasPermission(role, "stock", "create", perms);
  const canUpdate = hasPermission(role, "stock", "update", perms);
  const canDelete = hasPermission(role, "stock", "delete", perms);

  const router = useRouter();
  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [search, setSearch] = useState("");
  const [onlyLowStock, setOnlyLowStock] = useState(false);

  const fetchItems = useCallback(async (term: string) => {
    setLoading(true);
    try {
      const url = term.trim()
        ? `/api/stock?search=${encodeURIComponent(term.trim())}`
        : "/api/stock";
      const res = await fetch(url);
      setItems(res.ok ? await res.json() : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Busca com debounce — o cliente digita e a lista filtra sozinha
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchItems(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, fetchItems]);

  const lowStockCount = useMemo(
    () => items.filter((i) => i.quantity <= i.minQuantity).length,
    [items]
  );

  const visibleItems = useMemo(
    () => (onlyLowStock ? items.filter((i) => i.quantity <= i.minQuantity) : items),
    [items, onlyLowStock]
  );

  const handleNew = () => {
    setEditingItem(null);
    setShowForm(true);
  };

  const handleEdit = (item: StockItem) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const handleDelete = async (item: StockItem) => {
    if (!confirm(`Excluir item "${item.description}"?`)) return;

    const res = await fetch(`/api/stock/${item.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "Erro ao excluir");
      return;
    }
    fetchItems(search);
  };

  const handleSaved = () => {
    setShowForm(false);
    setEditingItem(null);
    fetchItems(search);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Estoque</h1>
        {canCreate && (
        <button
          onClick={handleNew}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          <Plus size={18} /> Novo Item
        </button>
        )}
      </div>

      {/* Busca + filtro de estoque baixo */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por código, código original, descrição, marca, aplicação ou localização..."
            aria-label="Buscar item no estoque"
            className="w-full pl-9 pr-9 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              aria-label="Limpar busca"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <button
          onClick={() => setOnlyLowStock((v) => !v)}
          aria-pressed={onlyLowStock}
          className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border ${
            onlyLowStock
              ? "bg-amber-100 border-amber-300 text-amber-800"
              : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"
          }`}
        >
          <AlertTriangle size={16} />
          Estoque baixo{lowStockCount > 0 ? ` (${lowStockCount})` : ""}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <p className="p-6 text-slate-500">Carregando...</p>
        ) : visibleItems.length === 0 ? (
          <div className="p-8 text-center">
            <Package size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">
              {search || onlyLowStock
                ? "Nenhum item encontrado para esse filtro"
                : "Nenhum item em estoque"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Código</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Descrição</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Aplicação</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Marca</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Local</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Qtd</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Custo</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Venda</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {visibleItems.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50 cursor-pointer"
                  onClick={() => router.push(`/dashboard/stock/${item.id}`)}
                >
                  {/* Código original (o que vem marcado na peça) é o principal;
                      o código do sistema fica em segundo plano */}
                  <td className="px-4 py-3">
                    <span className="font-mono font-medium text-slate-800">
                      {item.originalCode || item.code}
                    </span>
                    {item.originalCode && (
                      <span className="block font-mono text-xs text-slate-400">{item.code}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{item.description}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs max-w-[220px] truncate" title={item.application || ""}>
                    {item.application || "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{item.brand || "—"}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs font-medium">{item.location || "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 ${
                        item.quantity <= item.minQuantity
                          ? "text-red-600 font-medium"
                          : "text-slate-700"
                      }`}
                    >
                      {item.quantity <= item.minQuantity && <AlertTriangle size={14} />}
                      {item.quantity} {item.unit}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatCurrency(item.costPrice)}</td>
                  <td className="px-4 py-3 text-slate-700">{formatCurrency(item.sellPrice)}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {canUpdate && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(item);
                      }}
                      className="text-slate-400 hover:text-blue-600 p-1"
                      title="Editar"
                    >
                      <Pencil size={16} />
                    </button>
                    )}
                    {canDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(item);
                      }}
                      className="text-slate-400 hover:text-red-600 p-1 ml-1"
                      title="Excluir"
                    >
                      <Trash2 size={16} />
                    </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <StockItemForm
              item={editingItem}
              onSaved={handleSaved}
              onCancel={() => setShowForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
