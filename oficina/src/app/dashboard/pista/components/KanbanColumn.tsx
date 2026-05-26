"use client";

import { OrderStatus, PistaOrder, ColumnColor } from "../types";
import { KanbanCard } from "./KanbanCard";

interface KanbanColumnProps {
  status: OrderStatus;
  label: string;
  color: ColumnColor;
  orders: PistaOrder[];
  isOver: boolean;
  draggingId: string | null;
  onDragStart: (orderId: string, fromStatus: OrderStatus) => void;
  onDragEnter: () => void;
  onDragLeave: () => void;
  onDrop: () => void;
  onDragEnd: () => void;
  onCardClick: (orderId: string) => void;
  mechanicMap?: Record<string, string>;
}

export function KanbanColumn({
  status,
  label,
  color,
  orders,
  isOver,
  draggingId,
  onDragStart,
  onDragEnter,
  onDragLeave,
  onDrop,
  onDragEnd,
  onCardClick,
  mechanicMap,
}: KanbanColumnProps) {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    onDragEnter();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onDrop();
  };

  return (
    <div
      className={`flex flex-col min-w-[280px] max-w-[320px] lg:w-72 bg-gray-50 rounded-xl border-2 transition-colors snap-start ${
        isOver ? `${color.border} bg-gray-100` : "border-transparent"
      }`}
      data-kanban-column={status}
      onDragEnter={handleDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Cabeçalho da coluna */}
      <div className={`${color.header} rounded-t-xl px-4 py-3 flex items-center justify-between`}>
        <span className="text-white text-sm font-semibold">{label}</span>
        <span className="bg-white/20 border border-white/40 text-white text-xs font-bold px-2 py-0.5 rounded-full">
          {orders.length}
        </span>
      </div>

      {/* Lista de cards com scroll vertical independente */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[120px] max-h-[calc(100vh-220px)]">
        {orders.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-gray-400 text-sm italic">
            Nenhuma ordem de serviço
          </div>
        ) : (
          orders.map((order) => (
            <KanbanCard
              key={order.id}
              order={order}
              isDragging={draggingId === order.id}
              onDragStart={() => onDragStart(order.id, order.status)}
              onDragEnd={onDragEnd}
              onClick={() => onCardClick(order.id)}
              mechanicMap={mechanicMap}
            />
          ))
        )}
      </div>
    </div>
  );
}
