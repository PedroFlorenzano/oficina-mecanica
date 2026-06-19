"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Package } from "lucide-react";
import { formatCurrency } from "@/lib/format";

interface PartData {
  description: string;
  brand: string | null;
  code: string | null;
  totalQty: number;
  totalCost: number;
}

export default function PartsReportPage() {
  const [parts, setParts] = useState<PartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchData = useCallback(async (start?: string, end?: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (start) params.set("startDate", start);
    if (end) params.set("endDate", end);
    const res = await fetch(`/api/reports/parts?${params}`);
    if (res.ok) setParts(await res.json());
    setLoading(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchData(); }, [fetchData]);

  const handleFilter = () => fetchData(startDate, endDate);
  const handleClear = () => { setStartDate(""); setEndDate(""); fetchData(); };

  const maxQty = parts.length > 0 ? parts[0].totalQty : 1;

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/reports" className="text-slate-400 hover:text-slate-600"><ArrowLeft size={20} /></Link>
        <Package size={24} className="text-blue-600" />
        <h1 className="text-2xl font-bold text-slate-800">Peças Mais Usadas</h1>
      </div>

      {/* Filtro por período */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6 flex items-end gap-3 flex-wrap">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">De</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Até</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
        </div>
        <button onClick={handleFilter} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Filtrar</button>
        <button onClick={handleClear} className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50">Limpar</button>
      </div>

      {/* Tabela */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Carregando...</div>
      ) : parts.length === 0 ? (
        <div className="text-center py-12 text-slate-400">Nenhuma peça consumida no período</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">#</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Peça</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Marca</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Qtd</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Custo Total</th>
                <th className="px-4 py-3 font-medium text-slate-600 w-40"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {parts.map((p, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-400 font-medium">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{p.description}</td>
                  <td className="px-4 py-3 text-slate-500">{p.brand || "—"}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">{p.totalQty}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(p.totalCost)}</td>
                  <td className="px-4 py-3">
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${(p.totalQty / maxQty) * 100}%` }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
