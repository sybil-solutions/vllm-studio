// CRITICAL
"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";

export function useArtifactDrag({
  position,
  onCommitPosition,
}: {
  position: { x: number; y: number };
  onCommitPosition: (next: { x: number; y: number }) => void;
}): {
  isDragging: boolean;
  dragPosition: { x: number; y: number } | null;
  onMouseDown: (e: ReactMouseEvent) => void;
} {
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });

  const [isDraggingLocal, setIsDraggingLocal] = useState(false);
  const draggingRef = useRef(false);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const dragPositionRef = useRef<{ x: number; y: number }>(position);
  const dragRafRef = useRef<number | null>(null);
  const pendingPosRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    return () => {
      if (dragRafRef.current != null) {
        window.cancelAnimationFrame(dragRafRef.current);
        dragRafRef.current = null;
      }
    };
  }, []);

  const scheduleDragPositionUpdate = useCallback((next: { x: number; y: number }) => {
    pendingPosRef.current = next;
    if (dragRafRef.current != null) return;
    dragRafRef.current = window.requestAnimationFrame(() => {
      dragRafRef.current = null;
      const pending = pendingPosRef.current;
      if (!pending) return;
      setDragPosition(pending);
    });
  }, []);

  const onMouseDown = useCallback(
    (e: ReactMouseEvent) => {
      if (e.button !== 0) return;
      draggingRef.current = true;
      setIsDraggingLocal(true);
      dragPositionRef.current = position;
      setDragPosition(position);
      dragStartRef.current = { x: e.clientX, y: e.clientY, posX: position.x, posY: position.y };
    },
    [position],
  );

  const handleMouseMove = useCallback(
    (e: globalThis.MouseEvent) => {
      if (!draggingRef.current) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      const next = { x: dragStartRef.current.posX + dx, y: dragStartRef.current.posY + dy };
      dragPositionRef.current = next;
      scheduleDragPositionUpdate(next);
    },
    [scheduleDragPositionUpdate],
  );

  const handleMouseUp = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setIsDraggingLocal(false);
    setDragPosition(null);
    if (dragRafRef.current != null) {
      window.cancelAnimationFrame(dragRafRef.current);
      dragRafRef.current = null;
    }
    pendingPosRef.current = null;
    onCommitPosition(dragPositionRef.current);
  }, [onCommitPosition]);

  useEffect(() => {
    if (isDraggingLocal) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [handleMouseMove, handleMouseUp, isDraggingLocal]);

  return { isDragging: isDraggingLocal, dragPosition, onMouseDown };
}

