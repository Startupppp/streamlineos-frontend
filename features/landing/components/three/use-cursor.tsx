"use client";

import { useEffect, useRef } from "react";

export type CursorRef = {
  x: number;
  y: number;
  vx: number;
  vy: number;
};

export function useCursor() {
  const ref = useRef<CursorRef>({ x: 0, y: 0, vx: 0, vy: 0 });

  useEffect(() => {
    let last = { x: 0, y: 0 };
    const handle = (e: PointerEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = -((e.clientY / window.innerHeight) * 2 - 1);
      ref.current.vx = nx - last.x;
      ref.current.vy = ny - last.y;
      ref.current.x = nx;
      ref.current.y = ny;
      last = { x: nx, y: ny };
    };
    window.addEventListener("pointermove", handle, { passive: true });
    return () => window.removeEventListener("pointermove", handle);
  }, []);

  return ref;
}
