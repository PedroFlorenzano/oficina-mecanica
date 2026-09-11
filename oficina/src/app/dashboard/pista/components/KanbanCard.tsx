"use client";

import { PistaOrder } from "../types";
import { STATUS_CONFIG } from "../config";
import { formatCurrency, formatDate, daysSince, staleLevel, staleLabel } from "../utils";

interface KanbanCardProps {
  order: PistaOrder;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onClick: () => void;
  mechanicMap?: Record<string, string>;
}

export function KanbanCard({ order, isDragging, onDragStart, onDragEnd, onClick, mechanicMap }: KanbanCardProps) {
  const statusConfig = STATUS_CONFIG[order.status];
  const badgeClass = statusConfig ? statusConfig.color.badge : "bg-gray-500";
  const badgeTextClass = statusConfig ? statusConfig.color.badgeText : "text-white";

  const visibleComplaints = order.complaints.slice(0, 3);

  // Indicador de OS parada (item 44): tempo desde que entrou no status atual.
  // Fallback para createdAt quando o back-end não enviou statusSince.
  const stalledSince = order.statusSince ?? order.createdAt;
  const stalledDays = daysSince(stalledSince);
  const level = staleLevel(stalledDays);
  const stalledText = staleLabel(stalledDays);

  // Destaque visual crescente. A cor NÃO é o único sinal: há ícone + texto e
  // um title/aria-label descritivo, para leitores de tela e daltônicos.
  const stalePillClass =
    level === "critical"
      ? "bg-red-100 text-red-700 border border-red-300 font-semibold"
      : "bg-amber-100 text-amber-800 border border-amber-300";
  // Borda esquerda mais forte conforme o alerta escala.
  const staleBorderClass =
    level === "critical"
      ? "border-l-4 border-l-red-500"
      : level === "warning"
      ? "border-l-4 border-l-amber-400"
      : "";
  const staleAriaLabel =
    level === "critical"
      ? `Atenção: OS ${stalledText} no status atual — parada há muito tempo`
      : `OS ${stalledText} no status atual`;

  return (
    <div
      draggable={true}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`bg-white rounded-lg shadow-sm border border-gray-200 p-3 cursor-pointer hover:shadow-md transition-shadow select-none ${staleBorderClass} ${
        isDragging ? "opacity-50 shadow-lg" : ""
      }`}
    >
      {/* Número e badge de status */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-bold text-gray-700">#{order.number}</span>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badgeClass} ${badgeTextClass}`}>
          {statusConfig ? statusConfig.label : order.status}
        </span>
      </div>

      {/* Veículo */}
      <div className="text-sm font-medium text-gray-800 mb-1">
        {order.vehicle.brand} {order.vehicle.model}
      </div>
      <div className="text-xs text-gray-500 mb-2">{order.vehicle.plate}</div>

      {/* Cliente */}
      <div className="text-xs text-gray-600 truncate mb-1">
        <span className="font-medium">Cliente:</span> {order.client.name}
      </div>

      {/* Mecânico */}
      <div className="text-xs text-gray-600 truncate mb-2">
        <span className="font-medium">Mecânico:</span>{" "}
        {(() => {
          const mechId = order.services?.find((s) => s.mechanicId)?.mechanicId;
          return (mechId && mechanicMap?.[mechId]) || order.createdBy.name;
        })()}
      </div>

      {/* Complaints */}
      <div className="mb-2">
        {visibleComplaints.length === 0 ? (
          <p className="text-xs text-gray-400 italic">Sem reclamações</p>
        ) : (
          <ul className="space-y-0.5">
            {visibleComplaints.map((complaint, i) => (
              <li key={i} className="text-xs text-gray-600 truncate flex items-start gap-1">
                <span className="text-gray-400 mt-0.5">•</span>
                <span className="truncate">{complaint.description}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Rodapé: data e valor */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
        <span className="text-xs text-gray-500">{formatDate(order.createdAt)}</span>
        <span className="text-xs font-medium text-gray-700">{formatCurrency(order.totalAmount)}</span>
      </div>

      {/* Indicador de OS parada há muito tempo (item 44).
          Só aparece a partir do limiar de atenção. Comunica por ícone + texto,
          não só por cor, e expõe title/aria-label para acessibilidade. */}
      {level !== "none" && (
        <div
          role="status"
          aria-label={staleAriaLabel}
          title={staleAriaLabel}
          className={`mt-2 flex items-center gap-1 px-2 py-0.5 rounded text-xs ${stalePillClass}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="flex-shrink-0"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span className="truncate">
            {level === "critical" ? "⚠ " : ""}
            {stalledText}
          </span>
        </div>
      )}
    </div>
  );
}
