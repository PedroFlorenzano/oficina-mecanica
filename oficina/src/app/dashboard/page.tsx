"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { ClipboardList, Users, Car, Package, ArrowRight, Timer, DollarSign } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/format";

const statusConfig: Record<string, { label: string; color: string }> = {
  OPEN:             { label: "Aberta",              color: "bg-blue-100 text-blue-700" },
  IN_PROGRESS:      { label: "Em Execução",          color: "bg-yellow-100 text-yellow-700" },
  WAITING_PART:     { label: "Aguardando Peça",      color: "bg-orange-100 text-orange-700" },
  WAITING_APPROVAL: { label: "Aguardando Aprovação", color: "bg-purple-100 text-purple-700" },
  COMPLETED:        { label: "Concluída",            color: "bg-green-100 text-green-700" },
  DELIVERED:        { label: "Entregue",             color: "bg-slate-100 text-slate-700" },
  CANCELLED:        { label: "Cancelada",            color: "bg-red-100 text-red-700" },
};

// --- Admin/Attendant types ---

interface RecentOrder {
  id: string;
  number: number;
  status: string;
  totalAmount: number;
  createdAt: string;
  client: { name: string };
  vehicle: { plate: string; brand: string; model: string };
}

interface Summary {
  totalClients: number;
  totalVehicles: number;
  openOrders: number;
  totalStock: number;
  recentOrders: RecentOrder[];
}

// --- Mechanic types ---

interface MechanicOrder {
  id: string;
  number: number;
  status: string;
  totalAmount: number;
  createdAt: string;
  client: { name: string };
  vehicle: { plate: string; model: string };
}

interface ActiveTimer {
  id: string;
  startedAt: string;
  pausedAt: string | null;
  totalSeconds: number;
  orderService: {
    description: string;
    order: { number: number };
  };
}

interface MechanicData {
  assignedOrders: MechanicOrder[];
  activeTimers: ActiveTimer[];
  pendingCommissions: { count: number; total: number };
}

// --- Admin Dashboard ---

function AdminDashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/dashboard/summary")
      .then((r) => { if (!r.ok) throw new Error("Falha ao carregar"); return r.json(); })
      .then(setSummary)
      .catch(() => setError("Erro ao carregar dados do dashboard"))
      .finally(() => setLoading(false));
  }, []);

  const stats = [
    { label: "Clientes", value: summary?.totalClients ?? "—", icon: Users, color: "bg-blue-500", href: "/dashboard/clients" },
    { label: "Veículos", value: summary?.totalVehicles ?? "—", icon: Car, color: "bg-green-500", href: "/dashboard/vehicles" },
    { label: "OS em Aberto", value: summary?.openOrders ?? "—", icon: ClipboardList, color: "bg-orange-500", href: "/dashboard/orders" },
    { label: "Itens em Estoque", value: summary?.totalStock ?? "—", icon: Package, color: "bg-purple-500", href: "/dashboard/stock" },
  ];

  return (
    <>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center gap-4 hover:shadow-md hover:border-slate-300 transition-all group"
            >
              <div className={`${stat.color} p-3 rounded-lg`}>
                <Icon size={22} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                {loading ? (
                  <div className="h-7 w-12 bg-slate-200 rounded animate-pulse mb-1" />
                ) : (
                  <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
                )}
                <p className="text-sm text-slate-500">{stat.label}</p>
              </div>
              <ArrowRight size={16} className="text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
            </Link>
          );
        })}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-700">Últimas Ordens de Serviço</h2>
          <Link href="/dashboard/orders" className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
            Ver todas <ArrowRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : !summary?.recentOrders.length ? (
          <div className="p-10 text-center text-slate-400 text-sm">Nenhuma OS cadastrada ainda.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500">
              <tr>
                <th className="text-left px-4 py-3 font-medium">OS</th>
                <th className="text-left px-4 py-3 font-medium">Cliente</th>
                <th className="text-left px-4 py-3 font-medium">Veículo</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-right px-4 py-3 font-medium">Total</th>
                <th className="text-left px-4 py-3 font-medium">Data</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {summary.recentOrders.map((order) => {
                const st = statusConfig[order.status] ?? { label: order.status, color: "" };
                return (
                  <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-slate-700">#{order.number}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{order.client.name}</td>
                    <td className="px-4 py-3 text-slate-600">
                      <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded mr-1">{order.vehicle.plate}</span>
                      {order.vehicle.brand} {order.vehicle.model}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800">{formatCurrency(order.totalAmount)}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{new Date(order.createdAt).toLocaleDateString("pt-BR")}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/dashboard/orders/${order.id}`} className="text-blue-600 hover:text-blue-800 text-xs font-medium">Abrir →</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

// --- Mechanic Dashboard ---

function formatElapsed(startedAt: string, pausedAt: string | null, totalSeconds: number): string {
  if (pausedAt) {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}min ${s}s (pausado)`;
  }
  const elapsed = totalSeconds + Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

function MechanicDashboard() {
  const [data, setData] = useState<MechanicData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/dashboard/mechanic")
      .then((r) => { if (!r.ok) throw new Error("Falha ao carregar"); return r.json(); })
      .then(setData)
      .catch(() => setError("Erro ao carregar dados"))
      .finally(() => setLoading(false));
  }, []);

  const stats = [
    { label: "OS Atribuídas", value: data?.assignedOrders.length ?? "—", icon: ClipboardList, color: "bg-orange-500" },
    { label: "Cronômetros Ativos", value: data?.activeTimers.length ?? "—", icon: Timer, color: "bg-blue-500" },
    { label: "Comissões Pendentes", value: data ? formatCurrency(data.pendingCommissions.total) : "—", icon: DollarSign, color: "bg-green-500" },
  ];

  return (
    <>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center gap-4">
              <div className={`${stat.color} p-3 rounded-lg`}>
                <Icon size={22} className="text-white" />
              </div>
              <div>
                {loading ? (
                  <div className="h-7 w-16 bg-slate-200 rounded animate-pulse mb-1" />
                ) : (
                  <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
                )}
                <p className="text-sm text-slate-500">{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Timers */}
      {data && data.activeTimers.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-700">Cronômetros Ativos</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {data.activeTimers.map((timer) => (
              <div key={timer.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-800">{timer.orderService.description}</p>
                  <p className="text-xs text-slate-500">OS #{timer.orderService.order.number}</p>
                </div>
                <span className={`text-sm font-mono font-semibold ${timer.pausedAt ? "text-yellow-600" : "text-green-600"}`}>
                  {formatElapsed(timer.startedAt, timer.pausedAt, timer.totalSeconds)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assigned Orders Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-700">Minhas Ordens de Serviço</h2>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : !data?.assignedOrders.length ? (
          <div className="p-10 text-center text-slate-400 text-sm">Nenhuma OS atribuída.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500">
              <tr>
                <th className="text-left px-4 py-3 font-medium">OS</th>
                <th className="text-left px-4 py-3 font-medium">Cliente</th>
                <th className="text-left px-4 py-3 font-medium">Veículo</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Data</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.assignedOrders.map((order) => {
                const st = statusConfig[order.status] ?? { label: order.status, color: "" };
                return (
                  <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-slate-700">#{order.number}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{order.client.name}</td>
                    <td className="px-4 py-3 text-slate-600">
                      <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded mr-1">{order.vehicle.plate}</span>
                      {order.vehicle.model}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{new Date(order.createdAt).toLocaleDateString("pt-BR")}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/dashboard/orders/${order.id}`} className="text-blue-600 hover:text-blue-800 text-xs font-medium">Abrir →</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

// --- Main Page ---

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const role = session?.user?.role;

  if (status === "loading") {
    return (
      <div className="p-6">
        <div className="h-8 w-48 bg-slate-200 rounded animate-pulse mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Dashboard</h1>
      {role === "MECHANIC" ? <MechanicDashboard /> : <AdminDashboard />}
    </div>
  );
}
