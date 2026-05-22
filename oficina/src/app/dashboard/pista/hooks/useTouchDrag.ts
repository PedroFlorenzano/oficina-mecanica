"use client";

import { useRef, useCallback } from "react";
import { OrderStatus } from "../types";

interface UseTouchDragOptions {
  orderId: string;
  fromStatus: OrderStatus;
  onDragStart: (orderId: string, fromStatus: OrderStatus) => void;
  onDrop: (toStatus: OrderStatus) => void;
  onDragEnd: () => void;
}

/**
 * Hook para suporte a drag and drop em dispositivos touch via Pointer Events API.
 * Ativa o modo de arraste após 200ms de toque longo (long press).
 */
export function useTouchDrag({
  orderId,
  fromStatus,
  onDragStart,
  onDrop,
  onDragEnd,
}: UseTouchDragOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ghostRef = useRef<HTMLElement | null>(null);
  const isDraggingRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });

  const findColumnAtPoint = useCallback((x: number, y: number): OrderStatus | null => {
    const elements = document.elementsFromPoint(x, y);
    for (const el of elements) {
      const status = (el as HTMLElement).dataset?.kanbanColumn as OrderStatus | undefined;
      if (status) return status;
    }
    return null;
  }, []);

  const createGhost = useCallback((sourceEl: HTMLElement, x: number, y: number) => {
    const rect = sourceEl.getBoundingClientRect();
    const ghost = sourceEl.cloneNode(true) as HTMLElement;
    ghost.style.position = "fixed";
    ghost.style.left = `${rect.left}px`;
    ghost.style.top = `${rect.top}px`;
    ghost.style.width = `${rect.width}px`;
    ghost.style.opacity = "0.8";
    ghost.style.pointerEvents = "none";
    ghost.style.zIndex = "9999";
    ghost.style.transform = "rotate(2deg)";
    ghost.style.transition = "none";
    document.body.appendChild(ghost);
    ghostRef.current = ghost;
    return ghost;
  }, []);

  const removeGhost = useCallback(() => {
    if (ghostRef.current) {
      document.body.removeChild(ghostRef.current);
      ghostRef.current = null;
    }
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      // Only handle touch/pen input (not mouse — mouse uses HTML5 DnD)
      if (e.pointerType === "mouse") return;

      const target = e.currentTarget;
      startPosRef.current = { x: e.clientX, y: e.clientY };

      timerRef.current = setTimeout(() => {
        isDraggingRef.current = true;
        target.setPointerCapture(e.pointerId);
        createGhost(target, e.clientX, e.clientY);
        onDragStart(orderId, fromStatus);
      }, 200);
    },
    [orderId, fromStatus, onDragStart, createGhost]
  );

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType === "mouse") return;

    if (!isDraggingRef.current) {
      // Cancel timer if moved too much before 200ms
      const dx = Math.abs(e.clientX - startPosRef.current.x);
      const dy = Math.abs(e.clientY - startPosRef.current.y);
      if ((dx > 10 || dy > 10) && timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    if (ghostRef.current) {
      const rect = ghostRef.current.getBoundingClientRect();
      ghostRef.current.style.left = `${e.clientX - rect.width / 2}px`;
      ghostRef.current.style.top = `${e.clientY - rect.height / 2}px`;
    }
  }, []);

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (e.pointerType === "mouse") return;

      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      if (!isDraggingRef.current) return;

      isDraggingRef.current = false;
      removeGhost();

      const targetColumn = findColumnAtPoint(e.clientX, e.clientY);
      if (targetColumn) {
        onDrop(targetColumn);
      } else {
        onDragEnd();
      }
    },
    [onDrop, onDragEnd, removeGhost, findColumnAtPoint]
  );

  return {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
  };
}
