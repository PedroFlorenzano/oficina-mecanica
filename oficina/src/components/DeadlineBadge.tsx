"use client";

import { useState, useEffect } from "react";
import { Clock, RefreshCw, AlertTriangle } from "lucide-react";

interface DeadlineData {
  estimatedDelivery: string | null;
  estimatedDaysTotal: number | null;
  estimatedDaysReason: string | null;
}

interface DeadlineBreakdown {
  serviceDays: number;
  totalServiceMinutes: number;
  partsDays: number;
  criticalPart: string | null;
  totalDays: number;
  reason: string;
  estimatedDelivery: string;
  warnings: string[];
}

interface DeadlineBadgeProps {
  orderId: string;
  orderStatus: string;
}

export function DeadlineBadge({ orderId, orderStatus }: DeadlineBadgeProps) {
  const [data, setData] = useState<DeadlineData | null>(null);
  const [breakdown, setBreakdown] = useState<DeadlineBreakdown | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const TERMINAL = ["COMPLETED", "DELIVERED", "CANCELLED"];

  useEffect(() => {
    fetch(`/api/orders/${orderId}/deadline`)
      .then((r) => r.ok ? r.json() : null)
      .then(setData)
      .catch(() => {});
  }, [orderId]);

  const recalculate = async () => {
    setCalculating(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/deadline`, { method: "POST" });
      if (res.ok) {
        const result: DeadlineBreakdown = await res.json();
        setBreakdown(result);
        setData({
          estimatedDelivery: result.estimatedDelivery,
          estimatedDaysTotal: result.totalDays,
          estimatedDaysReason: result.reason,
        });
      }
    } catch { /* silencioso */ }
    setCalculating(false);
  };

  // Não mostrar para OSs terminais
  if (TERMINAL.includes(orderStatus)) return null;

  const days = data?.estimatedDaysTotal;
  const delivery = data?.estimatedDelivery;

  const getColor = () => {
    if (!days) return "bg-slate-50 border-slate-200 text-slate-600";
    if (days <= 2) return "bg-green-50 border-green-200 text-green-700";
    if (days <= 5) return "bg-amber-50 border-amber-200 text-amber-700";
    return "bg-red-50 border-red-200 text-red-700";
  };

  const getIcon = () => {
    if (!days) return "⚪";
    if (days <= 2) return "🟢";
    if (days <= 5) return "🟡";
    return "🔴";
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="relative inline-flex">
      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm cursor-pointer ${getColor()}`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <Clock size={14} />
        {delivery ? (
          <span className="font-medium">
            {getIcon()} Previsão: {formatDate(delivery)}
          </span>
        ) : (
          <span className="font-medium">⚪ Prazo não calculado</span>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); recalculate(); }}
          className="ml-1 p-0.5 rounded hover:bg-black/5"
          title="Recalcular prazo"
          disabled={calculating}
        >
          <RefreshCw size={12} className={calculating ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Tooltip */}
      {showTooltip && (breakdown || data) && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-slate-200 rounded-lg shadow-lg p-3 min-w-[280px] text-xs">
          {breakdown ? (
            <>
              <div className="space-y-1.5">
                <p className="text-slate-600">
                  <strong>Serviços:</strong> {breakdown.serviceDays} dia(s) úteis ({breakdown.totalServiceMinutes} min)
                </p>
                <p className="text-slate-600">
                  <strong>Peças:</strong> {breakdown.partsDays} dia(s) úteis
                  {breakdown.criticalPart && <span className="text-amber-600"> — {breakdown.criticalPart}</span>}
                </p>
                <p className="text-slate-800 font-medium border-t pt-1.5 mt-1.5">
                  Total: {breakdown.totalDays} dia(s) úteis ({breakdown.reason === "services" ? "limitado por serviços" : breakdown.reason === "parts" ? "limitado por peças" : "ambos"})
                </p>
              </div>
              {breakdown.warnings.length > 0 && (
                <div className="mt-2 pt-2 border-t space-y-0.5">
                  {breakdown.warnings.map((w, i) => (
                    <p key={i} className="text-amber-600 flex items-center gap-1">
                      <AlertTriangle size={10} /> {w}
                    </p>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-slate-500">
              {days ? `${days} dia(s) úteis — clique em ↻ para detalhes` : "Clique em ↻ para calcular"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
