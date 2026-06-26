"use client";

import { useEffect, useRef, useMemo } from "react";

const CONFETTI_COLORS = [
  "#06b6d4",
  "#1e40af",
  "#10B981",
  "#F59E0B",
  "#3B82F6",
  "#EF4444",
  "#8B5CF6",
];

interface ConfettiOverlayProps {
  onDone: () => void;
  /** Defaults to 3000ms */
  durationMs?: number;
}

export function ConfettiOverlay({ onDone, durationMs = 3000 }: ConfettiOverlayProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(onDone, durationMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [onDone, durationMs]);

  const dots = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => ({
        id: i,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 1.5}s`,
        size: `${6 + Math.random() * 8}px`,
        duration: `${1.5 + Math.random() * 1.5}s`,
      })),
    [],
  );

  return (
    <>
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .confetti-dot {
          position: fixed;
          top: 0;
          border-radius: 2px;
          pointer-events: none;
          animation: confetti-fall linear forwards;
          z-index: 9999;
        }
      `}</style>
      {dots.map((d) => (
        <span
          key={d.id}
          className="confetti-dot"
          style={{
            left: d.left,
            width: d.size,
            height: d.size,
            backgroundColor: d.color,
            animationDuration: d.duration,
            animationDelay: d.delay,
          }}
        />
      ))}
    </>
  );
}
