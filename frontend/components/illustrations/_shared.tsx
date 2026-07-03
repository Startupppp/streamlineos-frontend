"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export const GOLD = "#06b6d4";
export const BLUE = "#1e40af";
export const GOLD_LIGHT = "#22d3ee";
export const BLUE_LIGHT = "#3b82f6";
export const SKIN = "#ffb8b8";
export const SKIN_SHADOW = "#e6a0a0";
export const HAIR = "#2f2e41";

export interface IllustrationProps {
  className?: string;
}

export function Wrapper({ className, children }: IllustrationProps & { children: React.ReactNode }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || typeof svg.pauseAnimations !== "function") return;
    if (shouldReduceMotion) {
      svg.pauseAnimations();
    } else {
      svg.unpauseAnimations();
    }
  }, [shouldReduceMotion]);

  return (
    <svg
      ref={svgRef}
      className={cn("w-32 h-32", className)}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}
