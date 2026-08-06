"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { FileDown, Users, Package, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { PageHeader, Card, CardHeader, CardTitle, Button, Input } from "@/components/ui";

// ============================================
// Types
// ============================================

interface ReportData {
  totalOrders: number;
  totalRevenue: number;
  avgTicket: number;
  partsCost: number;
  grossProfit: number;
  fixedCosts: number;
  variableCosts: number;
  totalCosts: number;
  netProfit: number;
  profitMargin: number;
  profitability: { month: string; revenue: number; costs: number; netProfit: number; accumulated: number }[];
  cancelledCount: number;
  completedCount: number;
  byStatus: Record<string, { count: number; total: number }>;
  monthly: { month: string; revenue: number; count: number }[];
  profitByOrder: { id: string; number: number; client: string; plate: string; revenue: number; partsCost: number; profit: number; margin: number; date: string }[];
}

interface DREData {
  period: { start: string; end: string };
  revenue: { services: number; parts: number; total: number; orderCount: number };
  expenses: { fixed: number; variable: number; total: number; byCategory: Array<{ category: string; label: string; total: number }> };
  grossProfit: number;
  netProfit: number;
  margin: number;
  monthly: Array<{ month: string; revenue: number; fixedExpenses: number; variableExpenses: number; profit: number }>;
}

type Tab = "resumo" | "dre" | "lucro";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// ============================================
// Main Page
// ============================================

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>("resumo");
  const [data, setData] = useState<ReportData | null>(null);
  const [dre, setDre] = useState<DREData | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchData = useCallback(async (start?: string, end?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (start) params.set("startDate", start);
      if (end) params.set("endDate", end);

      const [resReport, resDre] = await Promise.all([
        fetch(`/api/reports?${params}`),
        fetch(`/api/financial/dre?${params}`),
      ]);

      if (resReport.ok) setData(await resReport.json());
      if (resDre.ok) setDre(await resDre.json());
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios"
        description="Visão financeira e operacional completa"
        action={
          <div className="flex items-center gap-2">
            <Link href="/dashboard/reports/productivity" className="inline-flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-sm font-medium text-slate-700">
              <Users size={16} /> Produtividade
            </Link>
            <Link href="/dashboard/reports/parts" className="inline-flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-sm font-medium text-slate-700">
              <Package size={16} /> Peças
            </Link>
            <a
              href={`/api/reports/pdf${startDate || endDate ? `?${new URLSearchParams({ ...(startDate && { startDate }), ...(endDate && { endDate }) })}` : ""}`}
              target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              <FileDown size={16} /> PDF
            </a>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        {([
          { id: "resumo", label: "Resumo" },
          { id: "dre", label: "DRE" },
          { id: "lucro", label: "Lucro por OS" },
        ] as { id: Tab; label: string }[]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filtro de período */}
      <div className="flex items-end gap-3 flex-wrap">
        <Input label="De" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <Input label="Até" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <Button onClick={handleFilter}>Filtrar</Button>
        {(startDate || endDate) && <Button variant="outline" onClick={handleClear}>Limpar</Button>}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Carregando...</div>
      ) : (
        <>
          {tab === "resumo" && data && <TabResumo data={data} />}
          {tab === "dre" && dre && <TabDRE dre={dre} />}
          {tab === "dre" && !dre && <p className="text-center py-8 text-slate-400">Nenhum dado de DRE disponível. Cadastre despesas no módulo Financeiro.</p>}
          {tab === "lucro" && data && <TabLucroOS data={data} />}
        </>
      )}
    </div>
  );
}

// ============================================
// Tab: Resumo
// ============================================

function TabResumo({ data }: { data: ReportData }) {
  return (
    <div className="space-y-5">
      {/* Cards principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs text-slate-500">FATURAMENTO</p>
          <p className="text-xl font-bold text-green-600">{fmt(data.totalRevenue)}</p>
          <p className="text-[10px] text-slate-400 mt-1">{data.completedCount} OS entregues</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500">CUSTO TOTAL</p>
          <p className="text-xl font-bold text-red-600">{fmt(data.totalCosts)}</p>
          <p className="text-[10px] text-slate-400 mt-1">Fixo + Variável + Peças</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500">LUCRO REAL</p>
          <p className={`text-xl font-bold ${data.netProfit >= 0 ? "text-blue-600" : "text-red-600"}`}>{fmt(data.netProfit)}</p>
          <p className="text-[10px] text-slate-400 mt-1">Margem: {data.profitMargin}%</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500">TICKET MÉDIO</p>
          <p className="text-xl font-bold text-slate-700">{fmt(data.avgTicket)}</p>
        </Card>
      </div>

      {/* Custos detalhados */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-xs text-slate-500">CUSTOS FIXOS</p>
          <p className="text-lg font-bold text-red-400">{fmt(data.fixedCosts)}</p>
          <p className="text-[10px] text-slate-400">Aluguel, energia, salários</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500">CUSTOS VARIÁVEIS</p>
          <p className="text-lg font-bold text-orange-500">{fmt(data.variableCosts)}</p>
          <p className="text-[10px] text-slate-400">Fornecedores, ferramentas</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500">CUSTO PEÇAS</p>
          <p className="text-lg font-bold text-red-500">{fmt(data.partsCost)}</p>
          <p className="text-[10px] text-slate-400">Consumo de estoque</p>
        </Card>
      </div>

      {/* Rentabilidade acumulada */}
      {data.profitability && data.profitability.length > 0 && (
        <Card className="p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Rentabilidade Acumulada</h3>
          <div className="space-y-3">
            {data.profitability.map((m) => {
              const maxVal = Math.max(...data.profitability.map(x => Math.abs(x.accumulated)), 1);
              const pct = Math.abs(m.accumulated) / maxVal * 100;
              return (
                <div key={m.month} className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 w-16">{m.month}</span>
                  <div className="flex-1 flex flex-col gap-1">
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Receita: {fmt(m.revenue)}</span>
                      <span>Custos: {fmt(m.costs)}</span>
                      <span className={m.netProfit >= 0 ? "text-green-600" : "text-red-600"}>
                        Mês: {m.netProfit >= 0 ? "+" : ""}{fmt(m.netProfit)}
                      </span>
                    </div>
                    <div className="bg-slate-100 rounded-full h-5 relative overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${m.accumulated >= 0 ? "bg-green-400" : "bg-red-400"}`}
                        style={{ width: `${pct}%` }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-slate-700">
                        {m.accumulated >= 0 ? "+" : ""}{fmt(m.accumulated)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

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
                  <div className="bg-blue-500 h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-slate-700">
                    {fmt(m.revenue)} ({m.count} OS)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

// ============================================
// Tab: DRE
// ============================================

function TabDRE({ dre }: { dre: DREData }) {
  const maxBarValue = Math.max(...dre.monthly.map((m) => Math.max(m.revenue, m.fixedExpenses + m.variableExpenses)), 1);

  return (
    <div className="space-y-5">
      {/* Resumo DRE */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <TrendingUp className="w-5 h-5 text-green-600 mx-auto mb-1" />
          <p className="text-xs text-gray-600">Receita (OS)</p>
          <p className="text-lg font-bold text-green-700">{fmt(dre.revenue.total)}</p>
          <p className="text-[10px] text-gray-500">{dre.revenue.orderCount} OS</p>
        </Card>
        <Card className="p-4 text-center">
          <TrendingDown className="w-5 h-5 text-red-600 mx-auto mb-1" />
          <p className="text-xs text-gray-600">Despesas</p>
          <p className="text-lg font-bold text-red-700">{fmt(dre.expenses.total)}</p>
          <p className="text-[10px] text-gray-500">Fixas + Variáveis</p>
        </Card>
        <Card className="p-4 text-center">
          <DollarSign className={`w-5 h-5 mx-auto mb-1 ${dre.netProfit >= 0 ? "text-blue-600" : "text-orange-600"}`} />
          <p className="text-xs text-gray-600">Lucro Líquido</p>
          <p className={`text-lg font-bold ${dre.netProfit >= 0 ? "text-blue-700" : "text-orange-700"}`}>{fmt(dre.netProfit)}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs text-gray-600">Margem</p>
          <p className="text-2xl font-bold text-purple-700">{dre.margin}%</p>
        </Card>
      </div>

      {/* Detalhamento */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Receitas</CardTitle></CardHeader>
          <div className="px-6 pb-4 space-y-2 text-sm">
            <div className="flex justify-between"><span>Serviços</span><span className="font-mono">{fmt(dre.revenue.services)}</span></div>
            <div className="flex justify-between"><span>Peças</span><span className="font-mono">{fmt(dre.revenue.parts)}</span></div>
            <div className="flex justify-between font-bold border-t pt-2"><span>Total</span><span className="font-mono">{fmt(dre.revenue.total)}</span></div>
          </div>
        </Card>
        <Card>
          <CardHeader><CardTitle>Despesas por Categoria</CardTitle></CardHeader>
          <div className="px-6 pb-4 space-y-2 text-sm max-h-48 overflow-y-auto">
            {dre.expenses.byCategory.length === 0 ? (
              <p className="text-gray-400">Nenhuma despesa paga no período</p>
            ) : (
              dre.expenses.byCategory.map((item) => (
                <div key={item.category} className="flex justify-between">
                  <span>{item.label}</span><span className="font-mono">{fmt(item.total)}</span>
                </div>
              ))
            )}
            <div className="flex justify-between font-bold border-t pt-2 text-xs">
              <span>Fixas: {fmt(dre.expenses.fixed)}</span>
              <span>Variáveis: {fmt(dre.expenses.variable)}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Gráfico mensal */}
      <Card className="p-5">
        <h3 className="font-semibold text-slate-800 mb-4">Evolução Mensal</h3>
        <div className="space-y-4">
          {dre.monthly.map((month) => (
            <div key={month.month} className="space-y-1">
              <div className="flex justify-between text-sm text-gray-600">
                <span className="font-medium">{month.month}</span>
                <span className={`font-bold ${month.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {month.profit >= 0 ? "+" : ""}{fmt(month.profit)}
                </span>
              </div>
              <div className="flex gap-1 h-5">
                <div className="bg-green-400 rounded-sm" style={{ width: `${(month.revenue / maxBarValue) * 100}%` }} title={`Receita: ${fmt(month.revenue)}`} />
              </div>
              <div className="flex gap-1 h-5">
                <div className="bg-red-300 rounded-sm" style={{ width: `${(month.fixedExpenses / maxBarValue) * 100}%` }} title={`Fixas: ${fmt(month.fixedExpenses)}`} />
                <div className="bg-orange-300 rounded-sm" style={{ width: `${(month.variableExpenses / maxBarValue) * 100}%` }} title={`Variáveis: ${fmt(month.variableExpenses)}`} />
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-6 mt-4 text-xs text-gray-500 border-t pt-3">
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-400 rounded-sm inline-block" /> Receita</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-300 rounded-sm inline-block" /> Fixas</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-orange-300 rounded-sm inline-block" /> Variáveis</span>
        </div>
      </Card>
    </div>
  );
}

// ============================================
// Tab: Lucro por OS
// ============================================

function TabLucroOS({ data }: { data: ReportData }) {
  return (
    <Card className="p-5">
      <h3 className="font-semibold text-slate-800 mb-4">Lucro por OS (últimas 50)</h3>
      {data.profitByOrder.length === 0 ? (
        <p className="text-center py-8 text-slate-400">Nenhuma OS concluída no período.</p>
      ) : (
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
                  <td className={`px-3 py-2 text-right font-medium ${o.profit >= 0 ? "text-green-600" : "text-red-600"}`}>{fmt(o.profit)}</td>
                  <td className={`px-3 py-2 text-right ${o.margin >= 30 ? "text-green-600" : o.margin >= 15 ? "text-yellow-600" : "text-red-600"}`}>{o.margin.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
