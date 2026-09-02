"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export function useRouteFocus(targetId = "dashboard-content"): void {
  const pathname = usePathname();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const target = document.getElementById(targetId);
    if (!target) return;
    if (!target.hasAttribute("tabindex")) {
      target.setAttribute("tabindex", "-1");
    }
    target.focus({ preventScroll: true });
  }, [pathname, targetId]);
}
