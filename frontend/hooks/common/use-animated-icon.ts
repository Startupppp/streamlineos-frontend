"use client";

import { useCallback, useRef } from "react";
import type { IconHandle } from "@animateicons/react";

export function useAnimatedIcon() {
  const iconRef = useRef<IconHandle>(null);

  const onMouseEnter = useCallback(() => {
    iconRef.current?.startAnimation?.();
  }, []);

  const onMouseLeave = useCallback(() => {
    iconRef.current?.stopAnimation?.();
  }, []);

  return { iconRef, hoverHandlers: { onMouseEnter, onMouseLeave } };
}
