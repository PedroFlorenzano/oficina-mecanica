"use client";

import { useState, useEffect } from "react";
import { Plus, ClipboardList, Search, Download } from "lucide-react";
import Link from "next/link";

interface Order {
  id: string;
  number: number;
  status: string;
  mileage: number;
  totalAmount: number;
  createdAt: string;
  client: { name: string };
  vehicle: { plate: string; model: string };
}

const statusLabels: Record<string, { label: string; color: string }> = {
  OPEN: { label: "Aberta", color: "bg-blue-100 text-blue-700" },
  IN_PROGRESS: { label: "Em Execução", color: "bg-yellow-100 text-yellow-700" },
  WAITING_PART: { label: "Aguardando Peça", color: "bg-orange-100 text-orange-700" },
  WAITING_APPROVAL: { label: "Aguardando Aprovação", color: "bg-purple-100 text-purple-700" },
  COMPLETED: { label: "Concluída", color: "bg-green-100 text-green-700" },
  DELIVERED: { label: "Entregue", color: "bg-slate-100 text-slate-700" },
  CANCELLED: { label: "Cancelada", color: "bg-red-100 text-red-700" },
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/orders")
      .then((res) => { if (!res.ok) throw new Error("Falha"); return res.json(); })
      .then((data) => { if (!cancelled) setOrders(data); })
      .catch(() => { if (!cancelled) setError("Erro ao carregar ordens de serviço"); });
    return () => { cancelled = true; };
  }, []);

  const loading = orders === null && !error;

  const filtered = (orders || []).filter((o) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      String(o.number).includes(q) ||
      o.client.name.toLowerCase().includes(q) ||
      o.vehicle.plate.toLowerCase().includes(q) ||
      o.vehicle.model.toLowerCase().includes(q)
    );
  });

  const exportCSV = () => {
    const header = "Nº;Cliente;Placa;Veículo;Status;Total;Data\n";
    const rows = filtered.map((o) =>
      `${o.number};${o.client.name};${o.vehicle.plate};${o.vehicle.model};${statusLabels[o.status]?.label || o.status};${o.totalAmount.toFixed(2)};${new Date(o.createdAt).toLocaleDateString("pt-BR")}`
    ).join("\n");
    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ordens-servico-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
      )}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Ordens de Serviço</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 border border-slate-300 text-slate-700 px-4 py-2.5 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
          >
            <Download size={16} />
            Exportar CSV
          </button>
          <Link
            href="/dashboard/orders/new"
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Plus size={18} />
            Nova OS
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Busca */}
        <div className="px-4 py-3 border-b border-slate-100">
          <div className="relative max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nº, cliente ou placa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {loading ? (
          <p className="p-6 text-slate-500">Carregando...</p>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center">
            <ClipboardList size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">Nenhuma OS cadastrada</p>
            <Link href="/dashboard/orders/new" className="text-blue-600 text-sm hover:underline mt-2 inline-block">
              Criar primeira OS
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Nº</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Cliente</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Veículo</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Total</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((order) => {
                const status = statusLabels[order.status] || { label: order.status, color: "bg-slate-100" };
                return (
                  <tr key={order.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => window.location.href = `/dashboard/orders/${order.id}`}>
                    <td className="px-4 py-3 font-mono font-medium text-slate-800">#{order.number}</td>
                    <td className="px-4 py-3 text-slate-700">{order.client.name}</td>
                    <td className="px-4 py-3 text-slate-600">{order.vehicle.plate} - {order.vehicle.model}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      R$ {order.totalAmount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(order.createdAt).toLocaleDateString("pt-BR")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
