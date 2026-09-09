"use client";

import { useEffect, useState } from "react";

export function useElapsedTime(startedAt: Date | string): string {
  const [elapsed, setElapsed] = useState("");
  useEffect(() => {
    const start = new Date(startedAt).getTime();
    const update = () => {
      const diff = Math.floor((Date.now() - start) / 1000);
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      setElapsed(
        h > 0
          ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
          : `${m}:${String(s).padStart(2, "0")}`,
      );
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  return elapsed;
}
