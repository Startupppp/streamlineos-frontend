"use client";

import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { CutoffChip } from "@/components/shared/cutoff-chip";
import { statusToneClasses } from "@/lib/design-tokens";
import { presentCutoff } from "@/lib/hrms/payroll-cutoff";
import { usePayrollCutoff } from "@/hooks/api/payroll/payroll-cutoff";
import { cn } from "@/lib/utils";

const READINESS_HREF = "/payroll/readiness";

export function HeaderPayrollCutoff({ compact = false }: { compact?: boolean }) {
  const { cutoff } = usePayrollCutoff();
  const presentation = cutoff ? presentCutoff(cutoff) : null;

  if (!presentation) return null;

  const tone = statusToneClasses(presentation.tone);
  const label = `Payroll cutoff: ${presentation.label}`;

  if (compact) {
    return (
      <Link
        href={READINESS_HREF}
        aria-label={label}
        title={presentation.label}
        className={cn(
          "group flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border outline-none transition-[color,background-color,box-shadow,transform] duration-200 hover:-translate-y-px hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transform-none motion-reduce:transition-none",
          tone.surface,
          tone.inkStrong,
          tone.rule,
        )}
      >
        <CalendarClock className="size-4 shrink-0" aria-hidden />
      </Link>
    );
  }

  return (
    <CutoffChip
      cutoff={cutoff}
      href={READINESS_HREF}
      className="hidden shrink-0 sm:inline-flex"
    />
  );
}
