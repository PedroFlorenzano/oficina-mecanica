"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Package, AlertTriangle, Pencil, Trash2 } from "lucide-react";
import StockItemForm from "./StockItemForm";

interface StockItem {
  id: string;
  code: string;
  barcode: string | null;
  description: string;
  brand: string | null;
  unit: string;
  quantity: number;
  minQuantity: number;
  costPrice: number;
  sellPrice: number;
  profitMargin: number | null;
  location: string | null;
  active: boolean;
}

export default function StockPage() {
  const router = useRouter();
  const [items, setItems] = useState<StockItem[]>([]);
  const [lowStockItems, setLowStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);

  const fetchItems = async () => {
    setLoading(true);
    const [itemsRes, alertsRes] = await Promise.all([
      fetch("/api/stock"),
      fetch("/api/stock/alerts"),
    ]);
    const itemsData = await itemsRes.json();
    setItems(itemsData);

    if (alertsRes.ok) {
      const alertsData = await alertsRes.json();
      setLowStockItems(Array.isArray(alertsData) ? alertsData : []);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, []);

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
    fetchItems();
  };

  const handleSaved = () => {
    setShowForm(false);
    setEditingItem(null);
    fetchItems();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Estoque</h1>
        <button
          onClick={handleNew}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          <Plus size={18} /> Novo Item
        </button>
      </div>

      {/* Painel de alertas de estoque baixo */}
      {lowStockItems.length > 0 && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={18} className="text-red-600" />
            <h2 className="font-semibold text-red-800">
              {lowStockItems.length}{" "}
              {lowStockItems.length === 1 ? "item" : "itens"} com estoque baixo
            </h2>
          </div>
          <div className="grid gap-2">
            {lowStockItems.map((item) => (
              <div key={item.id} className="flex justify-between text-sm text-red-700">
                <span>
                  <span className="font-mono">{item.code}</span> — {item.description}
                </span>
                <span>
                  {item.quantity} / mín {item.minQuantity} {item.unit}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <p className="p-6 text-slate-500">Carregando...</p>
        ) : items.length === 0 ? (
          <div className="p-8 text-center">
            <Package size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">Nenhum item em estoque</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Código</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Descrição</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Marca</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Local</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Qtd</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Custo</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Venda</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50 cursor-pointer"
                  onClick={() => router.push(`/dashboard/stock/${item.id}`)}
                >
                  <td className="px-4 py-3 font-mono text-slate-800">{item.code}</td>
                  <td className="px-4 py-3 text-slate-700">{item.description}</td>
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
                  <td className="px-4 py-3 text-slate-600">R$ {item.costPrice.toFixed(2)}</td>
                  <td className="px-4 py-3 text-slate-700">R$ {item.sellPrice.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
