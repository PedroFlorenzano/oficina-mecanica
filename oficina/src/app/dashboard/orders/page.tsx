"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Plus, ClipboardList, Search, Download, Filter } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatCurrency } from "@/lib/format";
import { hasPermission, parseCustomPermissions, Role } from "@/lib/permissions";

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

function SortIcon({ field, sortField, sortDir }: { field: string; sortField: string; sortDir: string }) {
  return <span className="ml-1 text-xs">{sortField === field ? (sortDir === "asc" ? "▲" : "▼") : ""}</span>;
}

export default function OrdersPage() {
  const { data: session } = useSession();
  const role = (session?.user?.role ?? "MECHANIC") as Role;
  const perms = parseCustomPermissions(session?.user?.customPermissions);
  const canCreate = hasPermission(role, "orders", "create", perms);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortField, setSortField] = useState<string>("number");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const router = useRouter();

  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [mechanicId, setMechanicId] = useState("");
  const [clientId, setClientId] = useState("");
  const [mechanics, setMechanics] = useState<{ id: string; name: string }[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/users").then(r => r.json()).then(setMechanics).catch(() => {});
    fetch("/api/clients").then(r => r.json()).then(setClients).catch(() => {});
  }, []);

  const fetchOrders = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", "15");
    if (statusFilter) params.set("status", statusFilter);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (mechanicId) params.set("mechanicId", mechanicId);
    if (clientId) params.set("clientId", clientId);
    fetch(`/api/orders?${params.toString()}`)
      .then((res) => { if (!res.ok) throw new Error("Falha"); return res.json(); })
      .then((res) => { setOrders(res.data); setTotalPages(Math.ceil(res.total / res.pageSize)); })
      .catch(() => setError("Erro ao carregar ordens de serviço"))
      .finally(() => setLoading(false));
  }, [page, statusFilter, startDate, endDate, mechanicId, clientId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchOrders();
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) fetchOrders();
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, [fetchOrders]);

  const filtered = orders.filter((o) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      String(o.number).includes(q) ||
      o.client.name.toLowerCase().includes(q) ||
      o.vehicle.plate.toLowerCase().includes(q) ||
      o.vehicle.model.toLowerCase().includes(q)
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    let aVal: string | number, bVal: string | number;
    switch (sortField) {
      case "number": aVal = a.number; bVal = b.number; break;
      case "client.name": aVal = a.client.name.toLowerCase(); bVal = b.client.name.toLowerCase(); break;
      case "status": aVal = a.status; bVal = b.status; break;
      case "totalAmount": aVal = a.totalAmount; bVal = b.totalAmount; break;
      case "createdAt": aVal = a.createdAt; bVal = b.createdAt; break;
      default: return 0;
    }
    if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
    if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };



  const exportCSV = () => {
    const params = new URLSearchParams();
    if (selectedIds.size > 0) {
      selectedIds.forEach(id => params.append("ids", id));
    } else {
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
    }
    window.open(`/api/orders/export?${params.toString()}`, "_blank");
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === sorted.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(sorted.map(o => o.id)));
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
            {selectedIds.size > 0 ? `Exportar (${selectedIds.size})` : "Exportar CSV"}
          </button>
          {canCreate && (
          <Link
            href="/dashboard/orders/new"
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Plus size={18} />
            Nova OS
          </Link>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Busca */}
        <div className="px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="relative max-w-sm flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nº, cliente ou placa..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${showFilters ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
            >
              <Filter size={14} />
              Filtros
            </button>
          </div>
          {showFilters && (
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Status</label>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-slate-200 rounded-lg text-sm px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Todos</option>
                  {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">De</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border border-slate-200 rounded-lg text-sm px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Até</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border border-slate-200 rounded-lg text-sm px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Mecânico</label>
                <select value={mechanicId} onChange={e => setMechanicId(e.target.value)} className="border border-slate-200 rounded-lg text-sm px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Todos</option>
                  {mechanics.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Cliente</label>
                <select value={clientId} onChange={e => setClientId(e.target.value)} className="border border-slate-200 rounded-lg text-sm px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Todos</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <button onClick={() => { setPage(1); fetchOrders(); }} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">Aplicar</button>
              <button onClick={() => { setStatusFilter(""); setStartDate(""); setEndDate(""); setMechanicId(""); setClientId(""); setPage(1); }} className="px-3 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">Limpar</button>
            </div>
          )}
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
                <th className="px-4 py-3 w-10">
                  <input type="checkbox" checked={selectedIds.size === sorted.length && sorted.length > 0} onChange={toggleAll} className="rounded border-slate-300" />
                </th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 cursor-pointer select-none" onClick={() => toggleSort("number")}>Nº<SortIcon field="number" sortField={sortField} sortDir={sortDir} /></th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 cursor-pointer select-none" onClick={() => toggleSort("client.name")}>Cliente<SortIcon field="client.name" sortField={sortField} sortDir={sortDir} /></th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Veículo</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 cursor-pointer select-none" onClick={() => toggleSort("status")}>Status<SortIcon field="status" sortField={sortField} sortDir={sortDir} /></th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 cursor-pointer select-none" onClick={() => toggleSort("totalAmount")}>Total<SortIcon field="totalAmount" sortField={sortField} sortDir={sortDir} /></th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 cursor-pointer select-none" onClick={() => toggleSort("createdAt")}>Data<SortIcon field="createdAt" sortField={sortField} sortDir={sortDir} /></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sorted.map((order) => {
                const status = statusLabels[order.status] || { label: order.status, color: "bg-slate-100" };
                return (
                  <tr key={order.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => router.push(`/dashboard/orders/${order.id}`)}>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.has(order.id)} onChange={() => toggleSelect(order.id)} className="rounded border-slate-300" />
                    </td>
                    <td className="px-4 py-3 font-mono font-medium text-slate-800">#{order.number}</td>
                    <td className="px-4 py-3 text-slate-700">{order.client.name}</td>
                    <td className="px-4 py-3 text-slate-600">{order.vehicle.plate} - {order.vehicle.model}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatCurrency(order.totalAmount)}
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

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Anterior
          </button>
          <span className="text-sm text-slate-600">Página {page} de {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  );
}
