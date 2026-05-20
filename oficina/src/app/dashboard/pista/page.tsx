"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface PistaOrder {
  id: string;
  number: number;
  status: string;
  totalAmount: number;
  createdAt: string;
  client: { name: string };
  vehicle: { plate: string; brand: string; model: string };
  complaints: { description: string }[];
  createdBy: { name: string };
}

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  OPEN: { label: "AGUARDANDO INICIO DO SERVIÇO", bg: "bg-orange-500", text: "text-white" },
  IN_PROGRESS: { label: "SERVIÇO EM ANDAMENTO", bg: "bg-blue-800", text: "text-white" },
  WAITING_PART: { label: "AGUARDANDO PEÇAS", bg: "bg-amber-400", text: "text-amber-900" },
  WAITING_APPROVAL: { label: "AGUARDANDO APROVAÇÃO", bg: "bg-purple-600", text: "text-white" },
  COMPLETED: { label: "CONCLUÍDA", bg: "bg-green-600", text: "text-white" },
};

export default function PistaPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<PistaOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterMechanic, setFilterMechanic] = useState("");

  useEffect(() => {
    fetch("/api/orders/pista")
      .then((r) => r.json())
      .then((data) => { setOrders(data); setLoading(false); });
  }, []);

  const filtered = orders.filter((o) => {
    if (filterStatus !== "ALL" && o.status !== filterStatus) return false;
    if (filterMechanic && !o.createdBy.name.toLowerCase().includes(filterMechanic.toLowerCase())) return false;
    return true;
  });

  if (loading) return <p className="p-6 text-slate-500">Carregando...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-4">Pista</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Profissional</label>
          <input
            type="text"
            value={filterMechanic}
            onChange={(e) => setFilterMechanic(e.target.value)}
            placeholder="Filtrar por profissional..."
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Todos</option>
            <option value="OPEN">Aguardando Início</option>
            <option value="IN_PROGRESS">Em Andamento</option>
            <option value="WAITING_PART">Aguardando Peças</option>
            <option value="WAITING_APPROVAL">Aguardando Aprovação</option>
            <option value="COMPLETED">Concluída</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <p className="text-slate-400 text-sm">Nenhuma OS encontrada.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map((order) => {
            const sc = statusConfig[order.status] || { label: order.status, bg: "bg-gray-500", text: "text-white" };
            return (
              <div
                key={order.id}
                onClick={() => router.push(`/dashboard/orders/${order.id}`)}
                className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden cursor-pointer hover:shadow-md transition-shadow flex flex-col"
              >
                {/* Top bar */}
                <div className="bg-slate-800 px-3 py-2 flex items-center justify-between">
                  <span className="text-white text-sm font-bold">OS #{order.number}</span>
                  <span className="text-slate-300 text-xs">Prisma:</span>
                </div>

                {/* Status badge */}
                <div className="px-3 pt-3">
                  <span className={`inline-block text-[10px] font-bold px-2 py-1 rounded ${sc.bg} ${sc.text}`}>
                    {sc.label}
                  </span>
                </div>

                {/* Vehicle */}
                <div className="px-3 pt-2">
                  <div className="bg-slate-100 border border-slate-200 rounded px-2 py-1 text-xs text-slate-700 font-medium">
                    {order.vehicle.model} • {order.vehicle.plate}
                  </div>
                </div>

                {/* Complaints */}
                <div className="px-3 pt-2 flex-1">
                  <ul className="text-xs text-slate-600 space-y-0.5 list-disc list-inside">
                    {order.complaints.slice(0, 3).map((c, i) => (
                      <li key={i} className="truncate">{c.description}</li>
                    ))}
                    {order.complaints.length === 0 && (
                      <li className="text-slate-400 italic">Sem reclamações</li>
                    )}
                  </ul>
                </div>

                {/* Client */}
                <div className="bg-slate-700 px-3 py-1.5 mt-2">
                  <p className="text-white text-xs font-medium truncate">{order.client.name}</p>
                </div>

                {/* Mechanic */}
                <div className="px-3 py-1.5 border-t border-slate-100">
                  <p className="text-xs text-slate-500">Profissional: <span className="text-slate-700 font-medium">{order.createdBy.name}</span></p>
                </div>

                {/* Footer */}
                <div className="px-3 py-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">{new Date(order.createdAt).toLocaleDateString("pt-BR")}</span>
                  <span className="text-xs font-bold text-green-700">R$ {order.totalAmount.toFixed(2)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
