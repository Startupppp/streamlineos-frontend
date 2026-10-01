import { statusToneClasses } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { readinessStateMeta, type ReadinessState } from "@/lib/hrms/readiness-state";

interface ReadinessBadgeProps {
  state: ReadinessState;
  label?: string;
  className?: string;
}

export function ReadinessBadge({ state, label, className }: ReadinessBadgeProps) {
  const meta = readinessStateMeta(state);
  const tone = statusToneClasses(meta.tone);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-micro font-semibold",
        tone.surface,
        tone.inkStrong,
        tone.rule,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", tone.fill)} aria-hidden />
      {label ?? meta.label}
    </span>
  );
}
