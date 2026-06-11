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
    <div className="relative rounded-lg border border-border bg-card p-3">
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[10px] font-mono uppercase tracking-[0.14em] text-slate-500">
          {label}
        </p>
        {icon && (
          <span
            className={cn(
              "h-5 w-5 rounded bg-gradient-to-br inline-flex items-center justify-center text-white",
              accentMap[accent],
            )}
          >
            {icon}
          </span>
        )}
      </div>
      <p className="font-display text-[1.25rem] font-extrabold tracking-tight text-slate-900 leading-none">
        {value}
      </p>
      {(delta || hint) && (
        <div className="mt-1.5 flex items-center gap-1.5 text-[10.5px]">
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
      )}
    </div>
  );
}
