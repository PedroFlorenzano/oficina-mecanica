"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PistaOrder, OrderStatus, KanbanColumnData } from "./types";
import { filterOrders, groupByStatus, isValidTransition } from "./utils";
import { KANBAN_COLUMNS, STATUS_CONFIG } from "./config";
import { KanbanBoard } from "./components/KanbanBoard";
import { PistaFilters } from "./components/PistaFilters";

export default function PistaPage() {
  const router = useRouter();

  // ─── Core state ──────────────────────────────────────────────────────────
  const [orders, setOrders] = useState<PistaOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterMechanic, setFilterMechanic] = useState("");

  // Mapa de mecânicos (id → nome) para exibir nos cards
  const [mechanicMap, setMechanicMap] = useState<Record<string, string>>({});

  // ─── Drag state ───────────────────────────────────────────────────────────
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<OrderStatus | null>(null);
  // fromStatus is tracked via ref — avoids triggering re-renders mid-drag
  const fromStatusRef = useRef<OrderStatus | null>(null);

  // ─── Toast error state (non-fatal, e.g. failed PATCH / invalid transition) ─
  const [toastError, setToastError] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up toast timer on unmount
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // ─── Data fetching ────────────────────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/orders/pista");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: PistaOrder[] = await res.json();
      setOrders(data);
    } catch {
      setError(
        "Falha ao carregar as ordens de serviço. Verifique sua conexão e tente novamente."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchOrders();
    // Buscar mecânicos para o mapa de nomes
    fetch("/api/users?role=MECHANIC")
      .then((r) => (r.ok ? r.json() : []))
      .then((users: { id: string; name: string }[]) => {
        const map: Record<string, string> = {};
        users.forEach((u) => { map[u.id] = u.name; });
        setMechanicMap(map);
      })
      .catch(() => {});
  }, [fetchOrders]);

  // ─── Toast helper ─────────────────────────────────────────────────────────
  const showToast = useCallback((message: string) => {
    setToastError(message);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastError(null), 5000);
  }, []);

  // ─── Derived / computed values ────────────────────────────────────────────
  const filteredOrders = filterOrders(orders, filterMechanic);
  const grouped = groupByStatus(filteredOrders);

  const columns: KanbanColumnData[] = KANBAN_COLUMNS.map((status) => ({
    status,
    label: STATUS_CONFIG[status].label,
    color: STATUS_CONFIG[status].color,
    orders: grouped[status],
  }));

  // ─── Drag handlers ────────────────────────────────────────────────────────
  const clearDragState = useCallback(() => {
    setDraggingId(null);
    setDragOverColumn(null);
    fromStatusRef.current = null;
  }, []);

  const handleDragStart = useCallback(
    (orderId: string, fromStatus: OrderStatus) => {
      setDraggingId(orderId);
      fromStatusRef.current = fromStatus;
    },
    []
  );

  const handleDragEnter = useCallback((status: OrderStatus) => {
    setDragOverColumn(status);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverColumn(null);
  }, []);

  const handleDragEnd = useCallback(() => {
    clearDragState();
  }, [clearDragState]);

  const handleDrop = useCallback(
    async (toStatus: OrderStatus) => {
      const currentDraggingId = draggingId;
      const fromStatus = fromStatusRef.current;

      // Drop on same column or no active drag → restore, no API call
      if (!currentDraggingId || !fromStatus || toStatus === fromStatus) {
        clearDragState();
        return;
      }

      // Invalid transition → reject immediately, no API call
      if (!isValidTransition(fromStatus, toStatus)) {
        showToast("Transição de status não permitida");
        clearDragState();
        return;
      }

      // Optimistic update — move card in local state before API responds
      const originalOrders = orders;
      setOrders((prev) =>
        prev.map((o) =>
          o.id === currentDraggingId ? { ...o, status: toStatus } : o
        )
      );
      clearDragState();

      // Persist via PATCH with 10 s timeout
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10_000);
        const res = await fetch("/api/orders/pista", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: currentDraggingId, status: toStatus }),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
      } catch {
        // Rollback optimistic update and notify user
        setOrders(originalOrders);
        showToast("Falha ao atualizar status da OS");
      }
    },
    [draggingId, orders, clearDragState, showToast]
  );

  const handleCardClick = useCallback(
    (orderId: string) => {
      router.push(`/dashboard/orders/${orderId}`);
    },
    [router]
  );

  // ─── Loading state ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-slate-500">
          <svg
            className="animate-spin h-6 w-6 text-blue-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Carregando ordens de serviço...</span>
        </div>
      </div>
    );
  }

  // ─── Fatal error state (initial GET failed) ───────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center px-4">
        <svg
          className="h-12 w-12 text-red-300"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
        <p className="text-slate-600 text-sm max-w-sm">{error}</p>
        <button
          onClick={fetchOrders}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  // ─── Main render ──────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      <h1 className="text-2xl font-bold text-slate-800 mb-4">Pista</h1>

      {/* Mechanic filter */}
      <PistaFilters value={filterMechanic} onChange={setFilterMechanic} />

      {/* Non-fatal error toast (PATCH failures, invalid transitions) */}
      {toastError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
        >
          <span>{toastError}</span>
          <button
            onClick={() => setToastError(null)}
            className="text-red-400 hover:text-red-600 flex-shrink-0 leading-none"
            aria-label="Fechar mensagem de erro"
          >
            ✕
          </button>
        </div>
      )}

      {/* Kanban board */}
      <div className="flex-1 overflow-hidden">
        <KanbanBoard
          columns={columns}
          draggingId={draggingId}
          dragOverColumn={dragOverColumn}
          onDragStart={handleDragStart}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onDragEnd={handleDragEnd}
          onCardClick={handleCardClick}
          mechanicMap={mechanicMap}
        />
      </div>

      {/* Legenda de transições permitidas */}
      <div className="mt-4 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500">
        <p className="font-semibold text-slate-600 mb-2">Transições permitidas</p>
        <ul className="space-y-1">
          <li><span className="font-medium text-purple-700">Aguardando Aprovação</span> → Aguardando Início ou Concluída <span className="text-slate-400">(casos simples sem serviço adicional)</span></li>
          <li><span className="font-medium text-orange-600">Aguardando Início</span> → Aguardando Peças ou Em Andamento</li>
          <li><span className="font-medium text-amber-600">Aguardando Peças</span> → Aguardando Início <span className="text-slate-400">(volta)</span> ou Em Andamento <span className="text-slate-400">(peças chegaram)</span></li>
          <li><span className="font-medium text-blue-800">Em Andamento</span> → Aguardando Peças <span className="text-slate-400">(faltou algo)</span> ou Concluída</li>
          <li><span className="font-medium text-green-700">Concluída</span> → nenhuma</li>
        </ul>
      </div>
    </div>
  );
}
