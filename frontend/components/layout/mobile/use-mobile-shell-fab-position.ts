"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";

export const MOBILE_SHELL_FAB_POSITION_KEY =
  "streamlineos:mobile-shell-fab:position";

const DRAG_THRESHOLD_PX = 8;
const EDGE_PADDING_PX = 8;
const FAB_SIZE_PX = 40;

type FabCoords = { left: number; top: number };

type DragSession = {
  pointerId: number;
  startX: number;
  startY: number;
  originLeft: number;
  originTop: number;
  width: number;
  height: number;
  active: boolean;
  pendingLeft: number | null;
  pendingTop: number | null;
  rafId: number | null;
};

function readSafeAreaInsets(): {
  top: number;
  right: number;
  bottom: number;
  left: number;
} {
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:fixed;inset:0;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px);visibility:hidden;pointer-events:none;";
  document.body.appendChild(probe);
  const style = getComputedStyle(probe);
  const insets = {
    top: Number.parseFloat(style.paddingTop) || 0,
    right: Number.parseFloat(style.paddingRight) || 0,
    bottom: Number.parseFloat(style.paddingBottom) || 0,
    left: Number.parseFloat(style.paddingLeft) || 0,
  };
  probe.remove();
  return insets;
}

function clampCoords(
  left: number,
  top: number,
  width: number,
  height: number,
  bottomObstructionPx = 0,
): FabCoords {
  const insets = readSafeAreaInsets();
  const minLeft = insets.left + EDGE_PADDING_PX;
  const minTop = insets.top + EDGE_PADDING_PX;
  const maxLeft = Math.max(
    minLeft,
    window.innerWidth - width - insets.right - EDGE_PADDING_PX,
  );
  const maxTop = Math.max(
    minTop,
    window.innerHeight -
      height -
      insets.bottom -
      bottomObstructionPx -
      EDGE_PADDING_PX,
  );
  return {
    left: Math.min(Math.max(left, minLeft), maxLeft),
    top: Math.min(Math.max(top, minTop), maxTop),
  };
}

function parseStoredPosition(raw: string): FabCoords | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("left" in parsed) ||
      !("top" in parsed)
    ) {
      return null;
    }
    const left = (parsed as { left: unknown }).left;
    const top = (parsed as { top: unknown }).top;
    if (
      typeof left !== "number" ||
      typeof top !== "number" ||
      !Number.isFinite(left) ||
      !Number.isFinite(top)
    ) {
      return null;
    }
    return { left, top };
  } catch {
    return null;
  }
}

function loadStoredPosition(): FabCoords | null {
  try {
    const raw = window.localStorage.getItem(MOBILE_SHELL_FAB_POSITION_KEY);
    if (!raw) return null;
    return parseStoredPosition(raw);
  } catch {
    return null;
  }
}

function persistPosition(coords: FabCoords): void {
  try {
    window.localStorage.setItem(
      MOBILE_SHELL_FAB_POSITION_KEY,
      JSON.stringify(coords),
    );
  } catch {
    return;
  }
}

type UseMobileShellFabPositionOptions = {
  onTap?: () => void;
  bottomObstructionPx?: number;
};

export function useMobileShellFabPosition(
  options: UseMobileShellFabPositionOptions = {},
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<FabCoords | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const suppressClickRef = useRef(false);
  const dragRef = useRef<DragSession | null>(null);
  const onTapRef = useRef(options.onTap);
  onTapRef.current = options.onTap;
  const bottomObstructionPx = options.bottomObstructionPx ?? 0;

  useEffect(() => {
    const stored = loadStoredPosition();
    if (!stored) return;
    const el = containerRef.current;
    const width = el?.offsetWidth || FAB_SIZE_PX;
    const height = el?.offsetHeight || FAB_SIZE_PX;
    setPosition(
      clampCoords(stored.left, stored.top, width, height, bottomObstructionPx),
    );
  }, [bottomObstructionPx]);

  useEffect(() => {
    function handleResize() {
      setPosition((prev) => {
        if (!prev) return prev;
        const el = containerRef.current;
        const width = el?.offsetWidth || FAB_SIZE_PX;
        const height = el?.offsetHeight || FAB_SIZE_PX;
        return clampCoords(prev.left, prev.top, width, height, bottomObstructionPx);
      });
    }

    handleResize();
    window.addEventListener("resize", handleResize);
    window.visualViewport?.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.visualViewport?.removeEventListener("resize", handleResize);
    };
  }, [bottomObstructionPx]);

  const flushDrag = useCallback(() => {
    const drag = dragRef.current;
    if (!drag) return;
    drag.rafId = null;
    if (drag.pendingLeft === null || drag.pendingTop === null) return;
    const el = containerRef.current;
    if (!el) return;
    const dx = drag.pendingLeft - drag.originLeft;
    const dy = drag.pendingTop - drag.originTop;
    drag.pendingLeft = null;
    drag.pendingTop = null;
    el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
  }, []);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      const el = containerRef.current;
      if (!el) return;

      suppressClickRef.current = false;
      const rect = el.getBoundingClientRect();
      dragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originLeft: rect.left,
        originTop: rect.top,
        width: rect.width,
        height: rect.height,
        active: false,
        pendingLeft: null,
        pendingTop: null,
        rafId: null,
      };
      el.setPointerCapture(event.pointerId);
    },
    [],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag || event.pointerId !== drag.pointerId) return;

      const distance = Math.hypot(
        event.clientX - drag.startX,
        event.clientY - drag.startY,
      );

      if (!drag.active) {
        if (distance < DRAG_THRESHOLD_PX) return;
        drag.active = true;
        suppressClickRef.current = true;
        setIsDragging(true);

        const el = containerRef.current;
        if (el) {
          el.style.left = `${drag.originLeft}px`;
          el.style.top = `${drag.originTop}px`;
          el.style.right = "auto";
          el.style.bottom = "auto";
          el.style.transform = "translate3d(0,0,0)";
        }
        setPosition({ left: drag.originLeft, top: drag.originTop });
      }

      event.preventDefault();
      const next = clampCoords(
        drag.originLeft + (event.clientX - drag.startX),
        drag.originTop + (event.clientY - drag.startY),
        drag.width,
        drag.height,
        bottomObstructionPx,
      );
      drag.pendingLeft = next.left;
      drag.pendingTop = next.top;
      if (drag.rafId === null) {
        drag.rafId = requestAnimationFrame(flushDrag);
      }
    },
    [flushDrag, bottomObstructionPx],
  );

  const endDrag = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>, opts?: { commitTap: boolean }) => {
      const drag = dragRef.current;
      if (!drag || event.pointerId !== drag.pointerId) return;

      if (drag.rafId !== null) {
        cancelAnimationFrame(drag.rafId);
        drag.rafId = null;
      }

      const el = containerRef.current;
      const wasDrag = drag.active;

      if (wasDrag) {
        let finalLeft = drag.originLeft;
        let finalTop = drag.originTop;
        if (drag.pendingLeft !== null && drag.pendingTop !== null) {
          finalLeft = drag.pendingLeft;
          finalTop = drag.pendingTop;
        } else if (el) {
          const rect = el.getBoundingClientRect();
          finalLeft = rect.left;
          finalTop = rect.top;
        }
        const clamped = clampCoords(
          finalLeft,
          finalTop,
          drag.width,
          drag.height,
          bottomObstructionPx,
        );
        if (el) {
          el.style.left = `${clamped.left}px`;
          el.style.top = `${clamped.top}px`;
          el.style.right = "auto";
          el.style.bottom = "auto";
          el.style.transform = "";
        }
        setPosition(clamped);
        persistPosition(clamped);
        setIsDragging(false);
      }

      dragRef.current = null;
      if (el?.hasPointerCapture(event.pointerId)) {
        el.releasePointerCapture(event.pointerId);
      }

      suppressClickRef.current = true;
      if (!wasDrag && opts?.commitTap) {
        onTapRef.current?.();
      }
    },
    [bottomObstructionPx],
  );

  const handlePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      endDrag(event, { commitTap: true });
    },
    [endDrag],
  );

  const handlePointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      endDrag(event, { commitTap: false });
    },
    [endDrag],
  );

  const consumeSuppressClick = useCallback(() => {
    if (!suppressClickRef.current) return false;
    suppressClickRef.current = false;
    return true;
  }, []);

  const isPositioned = position !== null;

  const style: CSSProperties =
    position !== null
      ? {
          left: position.left,
          top: position.top,
          right: "auto",
          bottom: "auto",
          touchAction: "none",
        }
      : { touchAction: "none" };

  return {
    containerRef,
    style,
    isDragging,
    isPositioned,
    pointerHandlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerCancel,
    },
    consumeSuppressClick,
  };
}
