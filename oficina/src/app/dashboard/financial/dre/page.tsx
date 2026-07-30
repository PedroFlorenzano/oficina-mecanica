"use client";

import { useState, useEffect } from "react";
import {
  DollarSign, TrendingUp, TrendingDown, BarChart3, Calendar
} from "lucide-react";
import {
  Button, Card, CardHeader, CardTitle, PageHeader, Input
} from "@/components/ui";

interface DREData {
  period: { start: string; end: string };
  revenue: { services: number; parts: number; total: number; orderCount: number };
  expenses: {
    fixed: number; variable: number; total: number;
    byCategory: Array<{ category: string; label: string; total: number }>;
  };
  grossProfit: number;
  netProfit: number;
  margin: number;
  monthly: Array<{
    month: string; revenue: number; fixedExpenses: number;
    variableExpenses: number; profit: number;
  }>;
}

function formatMoney(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("pt-BR");
}

export default function DREPage() {
  const [dre, setDre] = useState<DREData | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 5);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  });

  const fetchDRE = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ startDate, endDate });
      const res = await fetch(`/api/financial/dre?${params}`);
      if (res.ok) {
        const data = await res.json();
        setDre(data);
      }
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchDRE(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="DRE — Demonstrativo de Resultados" description="Receitas vs Despesas" />
        <div className="text-center py-16 text-gray-500">Calculando DRE...</div>
      </div>
    );
  }

  if (!dre) {
    return (
      <div className="space-y-6">
        <PageHeader title="DRE — Demonstrativo de Resultados" description="Receitas vs Despesas" />
        <div className="text-center py-16 text-red-500">Erro ao carregar DRE. Cadastre lançamentos financeiros primeiro.</div>
      </div>
    );
  }

  const maxBarValue = Math.max(
    ...dre.monthly.map((m) => Math.max(m.revenue, m.fixedExpenses + m.variableExpenses)),
    1
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="DRE — Demonstrativo de Resultados"
        description="Receitas (OS entregues) vs Despesas (contas pagas)"
      />

      {/* Filtro de período */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4 flex-wrap">
            <Calendar className="w-4 h-4 text-gray-500" />
            <Input
              label="Início"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              label="Fim"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            <Button onClick={fetchDRE} className="mt-5">Atualizar</Button>
          </div>
        </CardHeader>
      </Card>

      {/* Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <TrendingUp className="w-5 h-5 text-green-600 mb-1" />
            <p className="text-xs text-gray-600">Receita (OS)</p>
            <p className="text-xl font-bold text-green-700">{formatMoney(dre.revenue.total)}</p>
            <p className="text-xs text-gray-500">{dre.revenue.orderCount} OS entregues</p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <TrendingDown className="w-5 h-5 text-red-600 mb-1" />
            <p className="text-xs text-gray-600">Despesas</p>
            <p className="text-xl font-bold text-red-700">{formatMoney(dre.expenses.total)}</p>
            <p className="text-xs text-gray-500">Fixas + Variáveis</p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <DollarSign className={`w-5 h-5 mb-1 ${dre.netProfit >= 0 ? "text-blue-600" : "text-orange-600"}`} />
            <p className="text-xs text-gray-600">Lucro Líquido</p>
            <p className={`text-xl font-bold ${dre.netProfit >= 0 ? "text-blue-700" : "text-orange-700"}`}>
              {formatMoney(dre.netProfit)}
            </p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <BarChart3 className="w-5 h-5 text-purple-600 mb-1" />
            <p className="text-xs text-gray-600">Margem</p>
            <p className="text-xl font-bold text-purple-700">{dre.margin}%</p>
          </CardHeader>
        </Card>
      </div>

      {/* Detalhamento */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Receitas */}
        <Card>
          <CardHeader>
            <CardTitle>Receitas</CardTitle>
          </CardHeader>
          <div className="px-6 pb-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Serviços</span>
              <span className="font-mono">{formatMoney(dre.revenue.services)}</span>
            </div>
            <div className="flex justify-between">
              <span>Peças</span>
              <span className="font-mono">{formatMoney(dre.revenue.parts)}</span>
            </div>
            <div className="flex justify-between font-bold border-t pt-2">
              <span>Total</span>
              <span className="font-mono">{formatMoney(dre.revenue.total)}</span>
            </div>
          </div>
        </Card>

        {/* Despesas por categoria */}
        <Card>
          <CardHeader>
            <CardTitle>Despesas por Categoria</CardTitle>
          </CardHeader>
          <div className="px-6 pb-4 space-y-2 text-sm max-h-60 overflow-y-auto">
            {dre.expenses.byCategory.length === 0 ? (
              <p className="text-gray-400">Nenhuma despesa paga no período</p>
            ) : (
              dre.expenses.byCategory.map((item) => (
                <div key={item.category} className="flex justify-between">
                  <span>{item.label}</span>
                  <span className="font-mono">{formatMoney(item.total)}</span>
                </div>
              ))
            )}
            <div className="flex justify-between font-bold border-t pt-2 text-xs">
              <span>Fixas: {formatMoney(dre.expenses.fixed)}</span>
              <span>Variáveis: {formatMoney(dre.expenses.variable)}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Gráfico mensal */}
      <Card>
        <CardHeader>
          <CardTitle>Evolução Mensal</CardTitle>
        </CardHeader>
        <div className="px-6 pb-4 space-y-4">
          {dre.monthly.map((month) => (
            <div key={month.month} className="space-y-1">
              <div className="flex justify-between text-sm text-gray-600">
                <span className="font-medium">{month.month}</span>
                <span className={`font-bold ${month.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {month.profit >= 0 ? "+" : ""}{formatMoney(month.profit)}
                </span>
              </div>
              <div className="flex gap-1 h-6">
                <div
                  className="bg-green-400 rounded-sm"
                  style={{ width: `${(month.revenue / maxBarValue) * 100}%` }}
                  title={`Receita: ${formatMoney(month.revenue)}`}
                />
              </div>
              <div className="flex gap-1 h-6">
                <div
                  className="bg-red-300 rounded-sm"
                  style={{ width: `${(month.fixedExpenses / maxBarValue) * 100}%` }}
                  title={`Fixas: ${formatMoney(month.fixedExpenses)}`}
                />
                <div
                  className="bg-orange-300 rounded-sm"
                  style={{ width: `${(month.variableExpenses / maxBarValue) * 100}%` }}
                  title={`Variáveis: ${formatMoney(month.variableExpenses)}`}
                />
              </div>
            </div>
          ))}
          <div className="flex gap-6 mt-4 text-xs text-gray-500 border-t pt-3">
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-400 rounded-sm inline-block" /> Receita</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-300 rounded-sm inline-block" /> Despesas Fixas</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-orange-300 rounded-sm inline-block" /> Despesas Variáveis</span>
          </div>
        </div>
      </Card>

      {/* Período */}
      <p className="text-xs text-gray-400 text-center">
        Período: {formatDate(dre.period.start)} a {formatDate(dre.period.end)}
      </p>
    </div>
  );
}
