import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  delta,
  hint,
  icon,
  accent = "blue",
}: {
  label: string;
  value: ReactNode;
  delta?: { value: string; direction?: "up" | "down" | "flat" };
  hint?: string;
  icon?: ReactNode;
  accent?: "blue" | "cyan" | "violet" | "emerald";
}) {
  const accentMap = {
    blue: "from-blue-500 to-blue-600",
    cyan: "from-cyan-500 to-blue-500",
    violet: "from-violet-500 to-blue-500",
    emerald: "from-emerald-500 to-cyan-500",
  };

  return (
    <div className="relative rounded-2xl border border-slate-200/80 bg-white p-5 overflow-hidden">
      <div className="flex items-start justify-between mb-4">
        <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-slate-500">
          {label}
        </p>
        {icon && (
          <span
            className={cn(
              "h-7 w-7 rounded-lg bg-gradient-to-br inline-flex items-center justify-center text-white shadow-[0_4px_12px_-4px_rgba(59,130,246,0.5)]",
              accentMap[accent],
            )}
          >
            {icon}
          </span>
        )}
      </div>
      <p className="font-display text-2xl lg:text-[1.75rem] font-extrabold tracking-tight text-slate-900 leading-none">
        {value}
      </p>
      <div className="mt-3 flex items-center gap-2 text-[11px]">
        {delta && (
          <span
            className={cn(
              "font-mono",
              delta.direction === "up"
                ? "text-emerald-600"
                : delta.direction === "down"
                  ? "text-red-600"
                  : "text-slate-500",
            )}
          >
            {delta.value}
          </span>
        )}
        {hint && <span className="text-slate-500">{hint}</span>}
      </div>
    </div>
  );
}
