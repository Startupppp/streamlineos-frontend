"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { orgScopedStorageKey } from "@/lib/org-scoped-storage";

type Position = { x: number; y: number };

const EDGE_GAP = 8;
const TOP_GAP = 64;
const DRAG_THRESHOLD = 5;

function readPosition(key: string): Position | null {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(key) ?? "null");
    if (!value || typeof value !== "object" || !("x" in value) || !("y" in value)) return null;
    const { x, y } = value as Position;
    return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
  } catch {
    return null;
  }
}

function save(key: string, value: string) {
  try { window.localStorage.setItem(key, value); } catch { /* Storage may be unavailable. */ }
}

export function useCompanionPlacement(scope: string, compact: boolean) {
  const rootRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef<Position | null>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number; origin: Position; moved: boolean } | null>(null);
  const suppressClickRef = useRef(false);
  const [position, setPosition] = useState<Position | null>(null);
  const [minimized, setMinimized] = useState(false);
  const positionKey = orgScopedStorageKey(compact ? "companion-position-mobile-v2" : "companion-position", scope);
  const minimizedKey = orgScopedStorageKey(compact ? "companion-minimized-mobile" : "companion-minimized", scope);

  const clamp = useCallback((next: Position): Position => {
    const rect = rootRef.current?.getBoundingClientRect();
    const width = rect?.width ?? 130;
    const height = rect?.height ?? 140;
    return {
      x: Math.max(EDGE_GAP, Math.min(next.x, window.innerWidth - width - EDGE_GAP)),
      y: Math.max(TOP_GAP, Math.min(next.y, window.innerHeight - height - (compact ? 72 : EDGE_GAP))),
    };
  }, [compact]);

  const place = useCallback((next: Position) => {
    const bounded = clamp(next);
    positionRef.current = bounded;
    setPosition(bounded);
    save(positionKey, JSON.stringify(bounded));
  }, [clamp, positionKey]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const stored = readPosition(positionKey);
      const bounded = stored ? clamp(stored) : null;
      positionRef.current = bounded;
      setPosition(bounded);
      try { setMinimized(window.localStorage.getItem(minimizedKey) === "1"); } catch { setMinimized(false); }
    });
    return () => { cancelled = true; };
  }, [clamp, minimizedKey, positionKey]);

  useEffect(() => {
    const onResize = () => {
      if (positionRef.current) place(positionRef.current);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [place]);

  function onPointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, origin: { x: rect.left, y: rect.top }, moved: false };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function onPointerMove(event: PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    drag.moved = true;
    const bounded = clamp({ x: drag.origin.x + dx, y: drag.origin.y + dy });
    positionRef.current = bounded;
    setPosition(bounded);
  }

  function onPointerUp(event: PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (drag.moved && positionRef.current) {
      save(positionKey, JSON.stringify(positionRef.current));
      suppressClickRef.current = true;
      window.setTimeout(() => { suppressClickRef.current = false; }, 0);
    }
  }

  function onPointerCancel() { dragRef.current = null; }

  function consumeDragClick(): boolean {
    if (!suppressClickRef.current) return false;
    suppressClickRef.current = false;
    return true;
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (!event.altKey) return;
    const delta: Record<string, Position> = {
      ArrowLeft: { x: -24, y: 0 }, ArrowRight: { x: 24, y: 0 },
      ArrowUp: { x: 0, y: -24 }, ArrowDown: { x: 0, y: 24 },
    };
    const step = delta[event.key];
    if (!step) return;
    event.preventDefault();
    const rect = rootRef.current?.getBoundingClientRect();
    if (rect) place({ x: rect.left + step.x, y: rect.top + step.y });
  }

  function toggleMinimized() {
    setMinimized((current) => {
      save(minimizedKey, current ? "0" : "1");
      return !current;
    });
    window.requestAnimationFrame(() => {
      if (positionRef.current) place(positionRef.current);
    });
  }

  return { rootRef, position, minimized, toggleMinimized, onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onKeyDown, consumeDragClick };
}
