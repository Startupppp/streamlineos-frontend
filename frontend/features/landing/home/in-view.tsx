"use client";

import { useRef, type ReactNode } from "react";
import { useInView } from "framer-motion";

/**
 * Marks its subtree `data-running="true"` only while it is on screen, so CSS
 * loops (the orbit) stop spending frames when nobody can see them.
 */
export function InView({ className, children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "100px 0px" });
  return (
    <div ref={ref} data-running={inView} className={className}>
      {children}
    </div>
  );
}
