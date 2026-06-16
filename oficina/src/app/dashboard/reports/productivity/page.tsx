"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Trophy, Clock, Target } from "lucide-react";
import { PageHeader } from "@/components/ui";

interface MechanicRanking {
  id: string;
  name: string;
  serviceCount: number;
  totalSeconds: number;
  avgSeconds: number;
  avgEstimatedSeconds: number;
  servicesWithEstimate: number;
  withinEstimate: number;
  withinPct: number;
}

function formatTime(seconds: number): string {
  if (!seconds) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

export default function ProductivityReportPage() {
  const [ranking, setRanking] = useState<MechanicRanking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/reports/productivity")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => setRanking(data.ranking))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6 text-slate-500">Carregando...</div>;

  return (
    <div>
      <PageHeader
        title="Produtividade — Comparativo"
        description="Ranking de mecânicos por eficiência (tempo real vs estimado)"
        action={<Link href="/dashboard/reports" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800"><ArrowLeft size={16} /> Voltar</Link>}
      />

      {/* Cards de resumo */}
      {ranking.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3">
            <Trophy className="text-yellow-600" size={24} />
            <div>
              <p className="text-xs text-yellow-700">Mais eficiente</p>
              <p className="font-bold text-yellow-900">{ranking[0]?.name || "—"}</p>
              <p className="text-xs text-yellow-600">{ranking[0]?.withinPct}% dentro do prazo</p>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
            <Clock className="text-blue-600" size={24} />
            <div>
              <p className="text-xs text-blue-700">Total de serviços apontados</p>
              <p className="font-bold text-blue-900">{ranking.reduce((s, r) => s + r.serviceCount, 0)}</p>
            </div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
            <Target className="text-green-600" size={24} />
            <div>
              <p className="text-xs text-green-700">Média geral dentro do prazo</p>
              <p className="font-bold text-green-900">
                {ranking.length > 0 ? Math.round(ranking.reduce((s, r) => s + r.withinPct, 0) / ranking.length) : 0}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabela ranking */}
      {ranking.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-slate-400">Nenhum apontamento de tempo encontrado</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500">#</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500">Mecânico</th>
                <th className="text-center px-4 py-3 text-xs font-bold text-slate-500">Serviços</th>
                <th className="text-center px-4 py-3 text-xs font-bold text-slate-500">Tempo Médio</th>
                <th className="text-center px-4 py-3 text-xs font-bold text-slate-500">Estimado Médio</th>
                <th className="text-center px-4 py-3 text-xs font-bold text-slate-500">Dentro do Prazo</th>
                <th className="text-right px-4 py-3 text-xs font-bold text-slate-500">Total Apontado</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {ranking.map((m, idx) => {
                const pctColor = m.withinPct >= 80 ? "text-green-700 bg-green-100" : m.withinPct >= 50 ? "text-yellow-700 bg-yellow-100" : "text-red-700 bg-red-100";
                return (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold text-slate-400">{idx + 1}º</td>
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/users/${m.id}`} className="font-medium text-blue-600 hover:underline">{m.name}</Link>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-700">{m.serviceCount}</td>
                    <td className="px-4 py-3 text-center text-slate-700">{formatTime(m.avgSeconds)}</td>
                    <td className="px-4 py-3 text-center text-slate-500">{formatTime(m.avgEstimatedSeconds)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${pctColor}`}>
                        {m.withinPct}% ({m.withinEstimate}/{m.servicesWithEstimate})
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">{formatTime(m.totalSeconds)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
