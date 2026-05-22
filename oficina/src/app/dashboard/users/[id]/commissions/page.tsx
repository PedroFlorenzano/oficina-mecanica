"use client";

import { useState, useEffect, use } from "react";
import { ArrowLeft, DollarSign, User } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui";

interface CommissionUser {
  id: string;
  name: string;
  email: string;
  role: string;
  commissionRate: number;
}

interface CommissionItem {
  id: string;
  baseValue: number;
  commissionValue: number;
  orderService: {
    description: string;
    order: { id: string; number: number; client: { name: string }; vehicle: { plate: string; model: string } };
  };
}

interface Commission {
  id: string;
  startDate: string;
  endDate: string;
  commissionRate: number;
  totalBase: number;
  totalCommission: number;
  status: string;
  approvedAt: string | null;
  paidAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  items: CommissionItem[];
}

interface Summary {
  totalPaid: number;
  totalApproved: number;
  totalPending: number;
  totalBase: number;
}

const statusConfig: Record<string, { label: string; variant: "warning" | "info" | "success" | "error" }> = {
  PENDING: { label: "Pendente", variant: "warning" },
  APPROVED: { label: "Aprovada", variant: "info" },
  PAID: { label: "Paga", variant: "success" },
  CANCELLED: { label: "Cancelada", variant: "error" },
};

export default function UserCommissionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [user, setUser] = useState<CommissionUser | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchData = (start?: string, end?: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (start) params.set("startDate", start);
    if (end) params.set("endDate", end);

    fetch(`/api/users/${id}/commissions?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setUser(data.user);
        setSummary(data.summary);
        setCommissions(data.commissions);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleFilter = () => { fetchData(startDate, endDate); };
  const handleClear = () => { setStartDate(""); setEndDate(""); fetchData(); };

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("pt-BR");

  if (loading) return <p className="p-6 text-slate-500">Carregando...</p>;
  if (!user) return <p className="p-6 text-red-500">Usuário não encontrado</p>;

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/users" className="text-slate-400 hover:text-slate-600">
          <ArrowLeft size={20} />
        </Link>
        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
          <DollarSign size={18} className="text-green-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">{user.name}</h1>
          <p className="text-sm text-slate-500">{user.email} · Taxa: {user.commissionRate}%</p>
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 text-center">
            <p className="text-xs text-slate-500 mb-1">TOTAL PAGO</p>
            <p className="text-xl font-bold text-green-600">{fmt(summary.totalPaid)}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 text-center">
            <p className="text-xs text-slate-500 mb-1">APROVADO (A PAGAR)</p>
            <p className="text-xl font-bold text-blue-600">{fmt(summary.totalApproved)}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 text-center">
            <p className="text-xs text-slate-500 mb-1">PENDENTE</p>
            <p className="text-xl font-bold text-yellow-600">{fmt(summary.totalPending)}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 text-center">
            <p className="text-xs text-slate-500 mb-1">BASE TOTAL (SERVIÇOS)</p>
            <p className="text-xl font-bold text-slate-700">{fmt(summary.totalBase)}</p>
          </div>
        </div>
      )}

      {/* Filtro por período */}
      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">De</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Até</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <button
          onClick={handleFilter}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
        >
          Filtrar
        </button>
        {(startDate || endDate) && (
          <button
            onClick={handleClear}
            className="px-4 py-2 text-slate-600 text-sm rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            Limpar
          </button>
        )}
      </div>

      {/* Commissions list */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <DollarSign size={16} className="text-slate-400" />
          <h2 className="font-semibold text-slate-700 text-sm">Histórico de Comissões</h2>
        </div>

        {commissions.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm">
            Nenhuma comissão encontrada para este mecânico.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {commissions.map((c) => {
              const st = statusConfig[c.status] ?? { label: c.status, variant: "default" as const };
              const isExpanded = expanded === c.id;

              return (
                <div key={c.id}>
                  <button
                    onClick={() => setExpanded(isExpanded ? null : c.id)}
                    className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {fmtDate(c.startDate)} — {fmtDate(c.endDate)}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Taxa: {c.commissionRate}% · {c.items.length} serviço{c.items.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-800">{fmt(c.totalCommission)}</p>
                        <p className="text-xs text-slate-500">de {fmt(c.totalBase)}</p>
                      </div>
                      <Badge variant={st.variant}>{st.label}</Badge>
                      <span className="text-slate-400 text-xs">{isExpanded ? "▲" : "▼"}</span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-4 bg-slate-50/50">
                      {c.paidAt && (
                        <p className="text-xs text-green-600 mb-2">Paga em: {fmtDate(c.paidAt)}</p>
                      )}
                      {c.approvedAt && !c.paidAt && (
                        <p className="text-xs text-blue-600 mb-2">Aprovada em: {fmtDate(c.approvedAt)}</p>
                      )}
                      {c.cancelReason && (
                        <p className="text-xs text-red-600 mb-2">Cancelada: {c.cancelReason}</p>
                      )}
                      <table className="w-full text-xs">
                        <thead className="text-slate-500">
                          <tr>
                            <th className="text-left py-1 font-medium">OS</th>
                            <th className="text-left py-1 font-medium">Cliente</th>
                            <th className="text-left py-1 font-medium">Veículo</th>
                            <th className="text-left py-1 font-medium">Serviço</th>
                            <th className="text-right py-1 font-medium">Base</th>
                            <th className="text-right py-1 font-medium">Comissão</th>
                          </tr>
                        </thead>
                        <tbody className="text-slate-700">
                          {c.items.map((item) => (
                            <tr key={item.id} className="border-t border-slate-100">
                              <td className="py-1.5">
                                <Link
                                  href={`/dashboard/orders/${item.orderService.order.id}`}
                                  className="text-blue-600 hover:underline"
                                >
                                  #{item.orderService.order.number}
                                </Link>
                              </td>
                              <td className="py-1.5">{item.orderService.order.client.name}</td>
                              <td className="py-1.5">{item.orderService.order.vehicle.model} — {item.orderService.order.vehicle.plate}</td>
                              <td className="py-1.5">{item.orderService.description}</td>
                              <td className="py-1.5 text-right">{fmt(item.baseValue)}</td>
                              <td className="py-1.5 text-right font-medium text-green-600">{fmt(item.commissionValue)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
