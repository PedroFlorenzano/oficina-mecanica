"use client";

import { useState, useEffect, useCallback } from "react";
import { Play, Pause, RotateCcw, CheckSquare, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { Button, Badge, Card, Modal } from "@/components/ui";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TimerLogData {
  id: string;
  startedAt: string;
  pausedAt: string | null;
  finishedAt: string | null;
  pauseReason: string | null;
  totalSeconds: number;
  orderServiceId: string;
  userId: string;
  createdAt: string;
}

export interface GetTimersByServiceResult {
  logs: TimerLogData[];
  netSeconds: number;
  status: "sem sessão" | "ativa" | "pausada" | "finalizada";
}

export interface TimerControlProps {
  orderServiceId: string;
  userId: string;
  userRole: string; // "MECHANIC" | "ADMIN" | "ATTENDANT"
  serviceDescription?: string;
  estimatedMinutes?: number | null;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

export function formatSeconds(seconds: number): string {
  const totalSec = Math.max(0, Math.floor(seconds));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

// ─── Status badge config ──────────────────────────────────────────────────────

type TimerStatus = "sem sessão" | "ativa" | "pausada" | "finalizada";

const statusConfig: Record<
  TimerStatus,
  { label: string; variant: "default" | "success" | "warning" | "error" | "info" | "purple" | "orange" }
> = {
  "sem sessão": { label: "Sem sessão", variant: "default" },
  ativa:        { label: "Em andamento", variant: "info" },
  pausada:      { label: "Pausado", variant: "warning" },
  finalizada:   { label: "Finalizado", variant: "success" },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function TimerControl({
  orderServiceId,
  userId: _userId,
  userRole,
  serviceDescription,
  estimatedMinutes,
}: TimerControlProps) {
  const isMechanic = userRole === "MECHANIC";

  const [timerData, setTimerData] = useState<GetTimersByServiceResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hideButtons, setHideButtons] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [recovering, setRecovering] = useState(false);

  // ── Display seconds (live counter) ──────────────────────────────────────────

  const [displaySeconds, setDisplaySeconds] = useState<number>(0);

  // Sync displaySeconds whenever timerData is refreshed
  useEffect(() => {
    if (!timerData) return;

    if (timerData.status === "ativa") {
      // netSeconds (sessões finalizadas) + elapsed da sessão ativa atual
      const activeLog = timerData.logs.find((l) => !l.finishedAt && !l.pausedAt);
      const elapsed = activeLog
        ? Math.floor((Date.now() - new Date(activeLog.startedAt).getTime()) / 1000)
        : 0;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisplaySeconds(timerData.netSeconds + elapsed);
    } else if (timerData.status === "pausada") {
      // netSeconds (sessões finalizadas) + totalSeconds da sessão pausada atual
      const pausedLog = timerData.logs.find((l) => l.pausedAt !== null && l.finishedAt === null);
      const pausedSeconds = pausedLog ? pausedLog.totalSeconds : 0;
      setDisplaySeconds(timerData.netSeconds + pausedSeconds);
    } else {
      setDisplaySeconds(timerData.netSeconds);
    }
  }, [timerData]);

  // Tick once per second while the timer is "ativa"
  useEffect(() => {
    if (timerData?.status !== "ativa") return;

    const interval = setInterval(() => {
      setDisplaySeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timerData?.status]);

  // ── Fetch state ─────────────────────────────────────────────────────────────

  const fetchTimerState = useCallback(async () => {
    try {
      const res = await fetch(`/api/order-services/${orderServiceId}/timers`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erro ao carregar dados do cronômetro");
      }
      const data: GetTimersByServiceResult = await res.json();
      setTimerData(data);
      setHideButtons(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar cronômetro");
    } finally {
      setLoading(false);
      setRecovering(false);
    }
  }, [orderServiceId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTimerState();
  }, [fetchTimerState]);

  // Recover: re-fetch state and show buttons again
  const handleRecover = async () => {
    setRecovering(true);
    setError(null);
    await fetchTimerState();
    setHideButtons(false);
  };

  // ── Active session helper ────────────────────────────────────────────────────

  const getActiveLog = (): TimerLogData | undefined =>
    timerData?.logs.find((l) => !l.finishedAt && !l.pausedAt);

  const getPausedLog = (): TimerLogData | undefined =>
    timerData?.logs.find((l) => l.pausedAt && !l.finishedAt);

  // ── Actions ──────────────────────────────────────────────────────────────────

  const handleStart = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/timer-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderServiceId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erro ao iniciar cronômetro");
      }
      await fetchTimerState();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao iniciar cronômetro");
      setHideButtons(true);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePauseConfirm = async (pauseReason: string) => {
    const activeLog = getActiveLog();
    if (!activeLog) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/timer-logs/${activeLog.id}/pause`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pauseReason }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erro ao pausar cronômetro");
      }
      await fetchTimerState();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao pausar cronômetro");
      setHideButtons(true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResume = async () => {
    const pausedLog = getPausedLog();
    if (!pausedLog) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/timer-logs/${pausedLog.id}/resume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erro ao retomar cronômetro");
      }
      await fetchTimerState();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao retomar cronômetro");
      setHideButtons(true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleFinish = async () => {
    // Finalizar pode ser chamado de uma sessão ativa OU pausada
    const targetLog = getActiveLog() ?? getPausedLog();
    if (!targetLog) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/timer-logs/${targetLog.id}/finish`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erro ao finalizar cronômetro");
      }
      await fetchTimerState();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao finalizar cronômetro");
      setHideButtons(true);
    } finally {
      setActionLoading(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Card className="animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-200" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-slate-200 rounded w-32" />
            <div className="h-4 bg-slate-200 rounded w-20" />
          </div>
        </div>
      </Card>
    );
  }

  const status = timerData?.status ?? "sem sessão";
  const logs = timerData?.logs ?? [];
  const badge = statusConfig[status];

  return (
    <>
      <Card>
        {/* Header row */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <Clock size={16} className="text-slate-400 shrink-0" />
            <span className="text-sm font-medium text-slate-700 truncate">
              {serviceDescription ?? "Cronômetro"}
            </span>
          </div>
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </div>

        {/* Time display — live when ativa, net otherwise */}
        <div className="flex items-center gap-3 mb-3">
          <span className="font-mono text-2xl font-bold text-slate-800 tracking-tight">
            {formatSeconds(displaySeconds)}
          </span>
          <span className="text-xs text-slate-400">
            {status === "ativa" ? "tempo em andamento" : "tempo líquido"}
          </span>
        </div>

        {/* Tempo estimado/previsto */}
        {estimatedMinutes != null && estimatedMinutes > 0 && (
          <div className="flex items-center gap-2 mb-3 px-2 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
            <Clock size={14} className="text-amber-600 shrink-0" />
            <span className="text-xs font-medium text-amber-700">
              Tempo previsto: {formatSeconds(estimatedMinutes * 60)}
            </span>
            {displaySeconds > estimatedMinutes * 60 && (
              <span className="text-xs font-medium text-red-600 ml-auto">⚠ Excedido</span>
            )}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3 flex items-start justify-between gap-2">
            <span>{error}</span>
            <button
              onClick={handleRecover}
              disabled={recovering}
              className="shrink-0 underline hover:no-underline disabled:opacity-50"
            >
              {recovering ? "Atualizando..." : "Atualizar estado"}
            </button>
          </div>
        )}

        {/* Action buttons — MECHANIC only */}
        {isMechanic && !hideButtons && (
          <MechanicControls
            status={status}
            loading={actionLoading}
            onStart={handleStart}
            onPauseConfirm={handlePauseConfirm}
            onResume={handleResume}
            onFinish={handleFinish}
          />
        )}

        {/* Session history toggle */}
        {logs.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <button
              onClick={() => setShowHistory((v) => !v)}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors"
            >
              {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {logs.length} {logs.length === 1 ? "sessão" : "sessões"} registradas
            </button>

            {showHistory && (
              <SessionHistoryTable logs={logs} userRole={userRole} onRefresh={fetchTimerState} />
            )}
          </div>
        )}
      </Card>
    </>
  );
}

// ─── Mechanic Controls Sub-component ─────────────────────────────────────────

interface MechanicControlsProps {
  status: TimerStatus;
  loading: boolean;
  onStart: () => void;
  onPauseConfirm: (reason: string) => void;
  onResume: () => void;
  onFinish: () => void;
}

function MechanicControls({
  status,
  loading,
  onStart,
  onPauseConfirm,
  onResume,
  onFinish,
}: MechanicControlsProps) {
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [pauseReason, setPauseReason] = useState("");

  const trimmedReason = pauseReason.trim();

  const handlePauseClick = () => {
    setPauseReason("");
    setShowPauseModal(true);
  };

  const handleModalClose = () => {
    setShowPauseModal(false);
    setPauseReason("");
  };

  const handlePauseSubmit = () => {
    if (trimmedReason.length < 3) return;
    setShowPauseModal(false);
    onPauseConfirm(trimmedReason);
    setPauseReason("");
  };

  if (status === "finalizada") return null;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {status === "sem sessão" && (
          <Button
            size="sm"
            variant="primary"
            icon={<Play size={14} />}
            loading={loading}
            onClick={onStart}
          >
            Iniciar
          </Button>
        )}

        {status === "ativa" && (
          <>
            <Button
              size="sm"
              variant="outline"
              icon={<Pause size={14} />}
              loading={loading}
              onClick={handlePauseClick}
            >
              Pausar
            </Button>
            <Button
              size="sm"
              variant="secondary"
              icon={<CheckSquare size={14} />}
              loading={loading}
              onClick={onFinish}
            >
              Finalizar
            </Button>
          </>
        )}

        {status === "pausada" && (
          <>
            <Button
              size="sm"
              variant="primary"
              icon={<RotateCcw size={14} />}
              loading={loading}
              onClick={onResume}
            >
              Retomar
            </Button>
            <Button
              size="sm"
              variant="secondary"
              icon={<CheckSquare size={14} />}
              loading={loading}
              onClick={onFinish}
            >
              Finalizar
            </Button>
          </>
        )}
      </div>

      {/* Pause reason modal */}
      <Modal
        isOpen={showPauseModal}
        onClose={handleModalClose}
        title="Motivo da Pausa"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Motivo da pausa <span className="text-red-500">*</span>
            </label>
            <textarea
              value={pauseReason}
              onChange={(e) => setPauseReason(e.target.value)}
              placeholder="Descreva o motivo (mín. 3 caracteres)..."
              maxLength={255}
              rows={3}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              autoFocus
            />
            <p className="text-xs text-slate-400 mt-1">
              {trimmedReason.length}/255 caracteres
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              disabled={loading}
              onClick={handleModalClose}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              variant="danger"
              icon={<Pause size={14} />}
              loading={loading}
              disabled={trimmedReason.length < 3}
              onClick={handlePauseSubmit}
            >
              Confirmar
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

// ─── Session History Table ────────────────────────────────────────────────────

function SessionHistoryTable({
  logs,
  userRole,
  onRefresh,
}: {
  logs: TimerLogData[];
  userRole: string;
  onRefresh: () => void;
}) {
  const isAdmin = userRole === "ADMIN";
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editHH, setEditHH] = useState("00");
  const [editMM, setEditMM] = useState("00");
  const [editSS, setEditSS] = useState("00");
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const startEdit = (log: TimerLogData) => {
    const total = log.totalSeconds;
    setEditHH(String(Math.floor(total / 3600)).padStart(2, "0"));
    setEditMM(String(Math.floor((total % 3600) / 60)).padStart(2, "0"));
    setEditSS(String(total % 60).padStart(2, "0"));
    setEditingId(log.id);
    setEditError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditError(null);
  };

  // Clamp a string to 0–max as integer
  const clampField = (val: string, max: number) => {
    const n = parseInt(val.replace(/\D/g, ""), 10);
    if (isNaN(n)) return "00";
    return String(Math.min(n, max)).padStart(2, "0");
  };

  const saveEdit = async (logId: string) => {
    const hh = parseInt(editHH, 10) || 0;
    const mm = parseInt(editMM, 10) || 0;
    const ss = parseInt(editSS, 10) || 0;
    const total = hh * 3600 + mm * 60 + ss;
    if (total < 0 || total > 86400) {
      setEditError("Valor máximo: 24:00:00");
      return;
    }
    setSaving(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/timer-logs/${logId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newTotalSeconds: total }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erro ao salvar correção");
      }
      setEditingId(null);
      onRefresh();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-2 overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-slate-400 border-b border-slate-100">
            <th className="text-left py-1.5 pr-3 font-medium">Início</th>
            <th className="text-left py-1.5 pr-3 font-medium">Fim / Pausa</th>
            <th className="text-left py-1.5 pr-3 font-medium">Motivo</th>
            <th className="text-right py-1.5 font-medium">Duração</th>
            {isAdmin && <th className="text-right py-1.5 font-medium w-16" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {logs.map((log) => {
            const endPoint = log.finishedAt ?? log.pausedAt;
            const isEditing = editingId === log.id;
            return (
              <tr key={log.id} className="text-slate-600">
                <td className="py-1.5 pr-3 whitespace-nowrap">
                  {new Date(log.startedAt).toLocaleString("pt-BR", {
                    day: "2-digit", month: "2-digit",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </td>
                <td className="py-1.5 pr-3 whitespace-nowrap">
                  {endPoint
                    ? new Date(endPoint).toLocaleString("pt-BR", {
                        day: "2-digit", month: "2-digit",
                        hour: "2-digit", minute: "2-digit",
                      })
                    : <span className="text-blue-500 font-medium">em andamento</span>}
                </td>
                <td className="py-1.5 pr-3 text-slate-500 max-w-[160px] truncate">
                  {log.pauseReason ?? "—"}
                </td>
                <td className="py-1.5 text-right font-mono tabular-nums">
                  {isEditing ? (
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-0.5">
                        <input
                          type="number"
                          min={0}
                          max={23}
                          value={editHH}
                          onChange={(e) => setEditHH(e.target.value)}
                          onBlur={(e) => setEditHH(clampField(e.target.value, 23))}
                          className="w-10 border border-slate-300 rounded px-1 py-0.5 text-center text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                          autoFocus
                        />
                        <span className="text-slate-400 font-mono">:</span>
                        <input
                          type="number"
                          min={0}
                          max={59}
                          value={editMM}
                          onChange={(e) => setEditMM(e.target.value)}
                          onBlur={(e) => setEditMM(clampField(e.target.value, 59))}
                          className="w-10 border border-slate-300 rounded px-1 py-0.5 text-center text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <span className="text-slate-400 font-mono">:</span>
                        <input
                          type="number"
                          min={0}
                          max={59}
                          value={editSS}
                          onChange={(e) => setEditSS(e.target.value)}
                          onBlur={(e) => setEditSS(clampField(e.target.value, 59))}
                          className="w-10 border border-slate-300 rounded px-1 py-0.5 text-center text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      {editError && (
                        <span className="text-red-500 text-xs">{editError}</span>
                      )}
                      <div className="flex gap-1 mt-0.5">
                        <button
                          onClick={() => saveEdit(log.id)}
                          disabled={saving}
                          className="text-xs px-2 py-0.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                          {saving ? "..." : "Salvar"}
                        </button>
                        <button
                          onClick={cancelEdit}
                          disabled={saving}
                          className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded hover:bg-slate-200"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    log.finishedAt || log.pausedAt
                      ? formatSeconds(log.totalSeconds)
                      : "—"
                  )}
                </td>
                {isAdmin && (
                  <td className="py-1.5 text-right">
                    {log.finishedAt && !isEditing && (
                      <button
                        onClick={() => startEdit(log)}
                        className="text-xs text-slate-400 hover:text-blue-600 transition-colors px-1"
                        title="Corrigir tempo"
                      >
                        ✏️
                      </button>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
