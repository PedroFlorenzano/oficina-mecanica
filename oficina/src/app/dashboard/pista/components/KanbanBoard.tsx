"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { OrderStatus, KanbanColumnData } from "../types";
import { KANBAN_COLUMNS, STATUS_CONFIG } from "../config";
import { KanbanColumn } from "./KanbanColumn";

interface KanbanBoardProps {
  columns: KanbanColumnData[];
  draggingId: string | null;
  dragOverColumn: OrderStatus | null;
  onDragStart: (orderId: string, fromStatus: OrderStatus) => void;
  onDragEnter: (status: OrderStatus) => void;
  onDragLeave: () => void;
  onDrop: (toStatus: OrderStatus) => void;
  onDragEnd: () => void;
  onCardClick: (orderId: string) => void;
}

export function KanbanBoard({
  columns,
  draggingId,
  dragOverColumn,
  onDragStart,
  onDragEnter,
  onDragLeave,
  onDrop,
  onDragEnd,
  onCardClick,
}: KanbanBoardProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollLeft = el.scrollLeft;
    const columnWidth = el.scrollWidth / KANBAN_COLUMNS.length;
    const index = Math.round(scrollLeft / columnWidth);
    setActiveIndex(Math.min(index, KANBAN_COLUMNS.length - 1));
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Build a map from status to column data for O(1) lookup
  const columnMap = new Map(columns.map((col) => [col.status, col]));

  return (
    <div className="flex flex-col gap-2">
      {/* Scroll container */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-4 min-h-[500px] snap-x snap-mandatory"
      >
        {KANBAN_COLUMNS.map((status) => {
          const col = columnMap.get(status);
          const config = STATUS_CONFIG[status];
          return (
            <KanbanColumn
              key={status}
              status={status}
              label={config.label}
              color={config.color}
              orders={col?.orders ?? []}
              isOver={dragOverColumn === status}
              draggingId={draggingId}
              onDragStart={onDragStart}
              onDragEnter={() => onDragEnter(status)}
              onDragLeave={onDragLeave}
              onDrop={() => onDrop(status)}
              onDragEnd={onDragEnd}
              onCardClick={onCardClick}
            />
          );
        })}
      </div>

      {/* Position indicator dots — only visible below lg breakpoint */}
      <div className="flex justify-center gap-2 lg:hidden" aria-hidden="true">
        {KANBAN_COLUMNS.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              const el = scrollRef.current;
              if (!el) return;
              const columnWidth = el.scrollWidth / KANBAN_COLUMNS.length;
              el.scrollTo({ left: columnWidth * i, behavior: "smooth" });
            }}
            className={`w-2 h-2 rounded-full transition-colors ${
              i === activeIndex ? "bg-blue-600" : "bg-gray-300"
            }`}
            aria-label={`Ir para coluna ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
