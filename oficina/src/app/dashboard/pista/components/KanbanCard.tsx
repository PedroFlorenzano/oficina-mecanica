"use client";

import { PistaOrder } from "../types";
import { STATUS_CONFIG } from "../config";
import { formatCurrency, formatDate } from "../utils";

interface KanbanCardProps {
  order: PistaOrder;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onClick: () => void;
}

export function KanbanCard({ order, isDragging, onDragStart, onDragEnd, onClick }: KanbanCardProps) {
  const statusConfig = STATUS_CONFIG[order.status];
  const badgeClass = statusConfig ? statusConfig.color.badge : "bg-gray-500";
  const badgeTextClass = statusConfig ? statusConfig.color.badgeText : "text-white";

  const visibleComplaints = order.complaints.slice(0, 3);

  return (
    <div
      draggable={true}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`bg-white rounded-lg shadow-sm border border-gray-200 p-3 cursor-pointer hover:shadow-md transition-shadow select-none ${
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

      {/* Profissional */}
      <div className="text-xs text-gray-600 truncate mb-2">
        <span className="font-medium">Profissional:</span> {order.createdBy.name}
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
    </div>
  );
}
