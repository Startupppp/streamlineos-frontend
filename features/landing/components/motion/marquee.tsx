"use client";

import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  speed?: number;
  className?: string;
  reverse?: boolean;
};

export function Marquee({ children, speed = 32, className, reverse }: Props) {
  return (
    <div className={`relative overflow-hidden ${className ?? ""}`}>
      <div
        className="marquee-track"
        style={{
          animationDuration: `${speed}s`,
          animationDirection: reverse ? "reverse" : "normal",
        }}
      >
        {children}
        {children}
      </div>
    </div>
  );
}
