"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { BarChart3, FileDown, Users } from "lucide-react";
import { PageHeader, Card, Button, Input } from "@/components/ui";

interface ReportData {
  totalOrders: number;
  totalRevenue: number;
  avgTicket: number;
  partsCost: number;
  grossProfit: number;
  cancelledCount: number;
  completedCount: number;
  byStatus: Record<string, { count: number; total: number }>;
  monthly: { month: string; revenue: number; count: number }[];
  profitByOrder: { id: string; number: number; client: string; plate: string; revenue: number; partsCost: number; profit: number; margin: number; date: string }[];
}

const statusLabels: Record<string, string> = {
  OPEN: "Aberta",
  IN_PROGRESS: "Em Execução",
  WAITING_PART: "Aguardando Peça",
  WAITING_APPROVAL: "Aguardando Aprovação",
  COMPLETED: "Concluída",
  DELIVERED: "Entregue",
  CANCELLED: "Cancelada",
};

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchData = useCallback(async (start?: string, end?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (start) params.set("startDate", start);
      if (end) params.set("endDate", end);
      const res = await fetch(`/api/reports?${params}`);
      if (res.ok) setData(await res.json());
    } catch {
      // silencioso
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchData(); }, [fetchData]);

  const handleFilter = () => fetchData(startDate, endDate);
  const handleClear = () => { setStartDate(""); setEndDate(""); fetchData(); };

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios"
        description="Resumo financeiro e operacional"
        action={
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/reports/productivity"
              className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-sm font-medium text-slate-700"
            >
              <Users size={16} /> Produtividade
            </Link>
            <a
              href={`/api/reports/pdf${startDate || endDate ? `?${new URLSearchParams({ ...(startDate && { startDate }), ...(endDate && { endDate }) })}` : ""}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              <FileDown size={16} /> Exportar PDF
            </a>
          </div>
        }
      />

      {/* Filtro por período */}
      <div className="flex items-end gap-3 flex-wrap">
        <Input label="De" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <Input label="Até" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <Button onClick={handleFilter}>Filtrar</Button>
        {(startDate || endDate) && <Button variant="outline" onClick={handleClear}>Limpar</Button>}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Carregando...</div>
      ) : data ? (
        <>
          {/* Cards principais */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <p className="text-xs text-slate-500">FATURAMENTO</p>
              <p className="text-xl font-bold text-green-600">{fmt(data.totalRevenue)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-slate-500">LUCRO BRUTO</p>
              <p className="text-xl font-bold text-blue-600">{fmt(data.grossProfit)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-slate-500">TICKET MÉDIO</p>
              <p className="text-xl font-bold text-slate-700">{fmt(data.avgTicket)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-slate-500">CUSTO PEÇAS</p>
              <p className="text-xl font-bold text-red-600">{fmt(data.partsCost)}</p>
            </Card>
          </div>

          {/* Cards secundários */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-4 text-center">
              <p className="text-xs text-slate-500">TOTAL OS</p>
              <p className="text-2xl font-bold text-slate-800">{data.totalOrders}</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-xs text-slate-500">CONCLUÍDAS</p>
              <p className="text-2xl font-bold text-green-600">{data.completedCount}</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-xs text-slate-500">CANCELADAS</p>
              <p className="text-2xl font-bold text-red-600">{data.cancelledCount}</p>
            </Card>
          </div>

          {/* Faturamento mensal */}
          <Card className="p-5">
            <h3 className="font-semibold text-slate-800 mb-4">Faturamento Mensal</h3>
            <div className="space-y-3">
              {data.monthly.map((m) => {
                const maxRevenue = Math.max(...data.monthly.map(x => x.revenue), 1);
                const pct = (m.revenue / maxRevenue) * 100;
                return (
                  <div key={m.month} className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 w-16">{m.month}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-6 relative overflow-hidden">
                      <div
                        className="bg-blue-500 h-full rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-slate-700">
                        {fmt(m.revenue)} ({m.count} OS)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Por status */}
          <Card className="p-5">
            <h3 className="font-semibold text-slate-800 mb-4">Distribuição por Status</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(data.byStatus).map(([status, info]) => (
                <div key={status} className="border border-slate-200 rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-500">{statusLabels[status] || status}</p>
                  <p className="text-lg font-bold text-slate-800">{info.count}</p>
                  <p className="text-xs text-slate-500">{fmt(info.total)}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Lucro por OS */}
          <Card className="p-5">
            <h3 className="font-semibold text-slate-800 mb-4">Lucro por OS (últimas 50)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-medium text-slate-500">Nº</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-slate-500">Cliente</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-slate-500">Placa</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-slate-500">Faturamento</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-slate-500">Custo Peças</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-slate-500">Lucro</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-slate-500">Margem</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.profitByOrder.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-mono">#{o.number}</td>
                      <td className="px-3 py-2">{o.client}</td>
                      <td className="px-3 py-2 text-slate-500">{o.plate}</td>
                      <td className="px-3 py-2 text-right">{fmt(o.revenue)}</td>
                      <td className="px-3 py-2 text-right text-red-600">{fmt(o.partsCost)}</td>
                      <td className={`px-3 py-2 text-right font-medium ${o.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(o.profit)}</td>
                      <td className={`px-3 py-2 text-right ${o.margin >= 30 ? 'text-green-600' : o.margin >= 15 ? 'text-yellow-600' : 'text-red-600'}`}>{o.margin.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
}
