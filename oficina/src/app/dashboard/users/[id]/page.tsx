"use client";

import { useState, useEffect, use } from "react";
import { ArrowLeft, Clock, User } from "lucide-react";
import Link from "next/link";

interface ProductivityUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface ServiceEntry {
  orderServiceId: string;
  orderId: string;
  orderNumber: number;
  orderStatus: string;
  orderCreatedAt: string;
  clientName: string;
  vehiclePlate: string;
  vehicleInfo: string;
  serviceDescription: string;
  estimatedMinutes: number | null;
  appointedSeconds: number;
}

const roleLabel: Record<string, string> = {
  ADMIN: "Administrador",
  ATTENDANT: "Atendente",
  MECHANIC: "Mecânico",
};

const statusLabel: Record<string, { label: string; color: string }> = {
  OPEN:             { label: "Aberta",               color: "bg-blue-100 text-blue-700" },
  IN_PROGRESS:      { label: "Em Execução",           color: "bg-yellow-100 text-yellow-700" },
  WAITING_PART:     { label: "Aguardando Peça",       color: "bg-orange-100 text-orange-700" },
  WAITING_APPROVAL: { label: "Aguardando Aprovação",  color: "bg-purple-100 text-purple-700" },
  COMPLETED:        { label: "Concluída",             color: "bg-green-100 text-green-700" },
  DELIVERED:        { label: "Entregue",              color: "bg-slate-100 text-slate-700" },
  CANCELLED:        { label: "Cancelada",             color: "bg-red-100 text-red-700" },
};

function formatMinutes(totalSeconds: number): string {
  if (totalSeconds === 0) return "—";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
}

function diffColor(estimated: number | null, appointedSeconds: number): string {
  if (estimated === null || appointedSeconds === 0) return "";
  const estimatedSeconds = estimated * 60;
  const ratio = appointedSeconds / estimatedSeconds;
  if (ratio <= 1.0) return "text-green-600";
  if (ratio <= 1.2) return "text-yellow-600";
  return "text-red-600";
}

export default function UserProductivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [user, setUser] = useState<ProductivityUser | null>(null);
  const [services, setServices] = useState<ServiceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/users/${id}/productivity`)
      .then((r) => {
        if (!r.ok) throw new Error("Erro ao carregar dados");
        return r.json();
      })
      .then((data) => {
        setUser(data.user);
        setServices(data.services);
      })
      .catch(() => setError("Erro ao carregar histórico de produtividade"))
      .finally(() => setLoading(false));
  }, [id]);

  // Summary totals
  const totalAppointed = services.reduce((s, e) => s + e.appointedSeconds, 0);
  const totalEstimated = services.reduce((s, e) => s + (e.estimatedMinutes ?? 0) * 60, 0);
  const completedCount = services.filter((e) => e.appointedSeconds > 0).length;

  if (loading) {
    return <p className="p-6 text-slate-500">Carregando...</p>;
  }

  if (error || !user) {
    return <p className="p-6 text-red-500">{error || "Usuário não encontrado"}</p>;
  }

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/users" className="text-slate-400 hover:text-slate-600">
          <ArrowLeft size={20} />
        </Link>
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
          <User size={18} className="text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">{user.name}</h1>
          <p className="text-sm text-slate-500">{user.email} · {roleLabel[user.role] ?? user.role}</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 text-center">
          <p className="text-xs text-slate-500 mb-1">SERVIÇOS COM APONTAMENTO</p>
          <p className="text-2xl font-bold text-slate-800">{completedCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 text-center">
          <p className="text-xs text-slate-500 mb-1">TEMPO TOTAL APONTADO</p>
          <p className="text-2xl font-bold text-slate-800">{formatMinutes(totalAppointed)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 text-center">
          <p className="text-xs text-slate-500 mb-1">TEMPO TOTAL ESTIMADO</p>
          <p className="text-2xl font-bold text-slate-800">
            {totalEstimated > 0 ? formatMinutes(totalEstimated) : "—"}
          </p>
        </div>
      </div>

      {/* Services table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <Clock size={16} className="text-slate-400" />
          <h2 className="font-semibold text-slate-700 text-sm">Histórico de Serviços</h2>
        </div>

        {services.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm">
            Nenhum serviço com apontamento de tempo encontrado.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500">
              <tr>
                <th className="text-left px-4 py-3 font-medium">OS</th>
                <th className="text-left px-4 py-3 font-medium">Cliente / Veículo</th>
                <th className="text-left px-4 py-3 font-medium">Serviço</th>
                <th className="text-left px-4 py-3 font-medium">Status OS</th>
                <th className="text-right px-4 py-3 font-medium">Est.</th>
                <th className="text-right px-4 py-3 font-medium">Apontado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {services.map((entry) => {
                const st = statusLabel[entry.orderStatus] ?? { label: entry.orderStatus, color: "" };
                const appointed = formatMinutes(entry.appointedSeconds);
                const estimated = entry.estimatedMinutes != null
                  ? `${entry.estimatedMinutes}m`
                  : "—";
                const apColor = diffColor(entry.estimatedMinutes, entry.appointedSeconds);

                return (
                  <tr key={entry.orderServiceId} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/orders/${entry.orderId}`}
                        className="font-mono text-blue-600 hover:underline font-medium"
                      >
                        #{entry.orderNumber}
                      </Link>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(entry.orderCreatedAt).toLocaleDateString("pt-BR")}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{entry.clientName}</p>
                      <p className="text-xs text-slate-500">
                        {entry.vehiclePlate} · {entry.vehicleInfo}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{entry.serviceDescription}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${st.color}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500 tabular-nums">
                      {estimated}
                    </td>
                    <td className={`px-4 py-3 text-right font-medium tabular-nums ${apColor}`}>
                      {appointed}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-slate-400 mt-3 px-1">
        * Tempo apontado considera apenas sessões finalizadas. Verde = dentro do estimado · Amarelo = até 20% acima · Vermelho = acima de 20%.
      </p>
    </div>
  );
}
