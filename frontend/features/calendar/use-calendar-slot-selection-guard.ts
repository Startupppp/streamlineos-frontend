import { useCallback, useLayoutEffect, useRef } from "react";
import type { SlotInfo } from "./big-calendar-wrapper";

const OVERLAY_DISMISS_BLOCK_MS = 300;

export function useCalendarSlotSelectionGuard(
  onSelectSlot: (slotInfo: SlotInfo) => void,
  isOverlayOpen: boolean,
) {
  const blockSelectionRef = useRef(false);
  const wasOverlayOpenRef = useRef(false);

  useLayoutEffect(() => {
    if (wasOverlayOpenRef.current && !isOverlayOpen) {
      blockSelectionRef.current = true;
      const timer = window.setTimeout(() => {
        blockSelectionRef.current = false;
      }, OVERLAY_DISMISS_BLOCK_MS);
      wasOverlayOpenRef.current = isOverlayOpen;
      return () => window.clearTimeout(timer);
    }
    wasOverlayOpenRef.current = isOverlayOpen;
  }, [isOverlayOpen]);

  return useCallback(
    (slotInfo: SlotInfo) => {
      if (isOverlayOpen || blockSelectionRef.current) return;
      onSelectSlot(slotInfo);
    },
    [isOverlayOpen, onSelectSlot],
  );
}
