"use client";

import { useCallback, useRef, type PointerEvent } from "react";

const DEFAULT_THRESHOLD_PX = 56;
const DEFAULT_AXIS_RATIO = 1.35;

interface UseHorizontalSwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  enabled?: boolean;
  thresholdPx?: number;
  axisRatio?: number;
}

interface SwipeOrigin {
  x: number;
  y: number;
  pointerId: number;
}

export function useHorizontalSwipe({
  onSwipeLeft,
  onSwipeRight,
  enabled = true,
  thresholdPx = DEFAULT_THRESHOLD_PX,
  axisRatio = DEFAULT_AXIS_RATIO,
}: UseHorizontalSwipeOptions) {
  const originRef = useRef<SwipeOrigin | null>(null);

  const onPointerDown = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (!enabled || event.button !== 0) return;
      originRef.current = {
        x: event.clientX,
        y: event.clientY,
        pointerId: event.pointerId,
      };
    },
    [enabled],
  );

  const onPointerUp = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      const origin = originRef.current;
      originRef.current = null;
      if (!enabled || !origin || origin.pointerId !== event.pointerId) return;

      const dx = event.clientX - origin.x;
      const dy = event.clientY - origin.y;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (absDx < thresholdPx) return;
      if (absDx < absDy * axisRatio) return;

      if (dx < 0) {
        onSwipeLeft?.();
        return;
      }
      onSwipeRight?.();
    },
    [axisRatio, enabled, onSwipeLeft, onSwipeRight, thresholdPx],
  );

  const onPointerCancel = useCallback(() => {
    originRef.current = null;
  }, []);

  return { onPointerDown, onPointerUp, onPointerCancel };
}
