"use client";

import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { CutoffChip } from "@/components/shared/cutoff-chip";
import { MobileOnlyLabelTooltip } from "@/components/ui/responsive-icon-label";
import { statusToneClasses } from "@/lib/design-tokens";
import { presentCutoff } from "@/lib/hrms/payroll-cutoff";
import { usePayrollCutoff } from "@/hooks/api/payroll/payroll-cutoff";
import { cn } from "@/lib/utils";

const READINESS_HREF = "/payroll/readiness";

function CutoffIconLink({
  label,
  tooltip,
  toneClassName,
  className,
}: {
  label: string;
  tooltip: string;
  toneClassName: string;
  className?: string;
}) {
  return (
    <MobileOnlyLabelTooltip label={tooltip} always side="bottom">
      <Link
        href={READINESS_HREF}
        aria-label={label}
        className={cn(
          "group flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border outline-none transition-[color,background-color,box-shadow,transform] duration-200 hover:-translate-y-px hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transform-none motion-reduce:transition-none",
          toneClassName,
          className,
        )}
      >
        <CalendarClock className="size-4 shrink-0" aria-hidden />
      </Link>
    </MobileOnlyLabelTooltip>
  );
}

export function HeaderPayrollCutoff({ compact = false }: { compact?: boolean }) {
  const { cutoff } = usePayrollCutoff();
  const presentation = cutoff ? presentCutoff(cutoff) : null;

  if (!presentation) return null;

  const tone = statusToneClasses(presentation.tone);
  const toneClassName = cn(tone.surface, tone.inkStrong, tone.rule);
  const label = `Payroll cutoff: ${presentation.label}`;

  if (compact) {
    return (
      <CutoffIconLink
        label={label}
        tooltip={presentation.label}
        toneClassName={toneClassName}
      />
    );
  }

  return (
    <>
      <CutoffIconLink
        label={label}
        tooltip={presentation.label}
        toneClassName={toneClassName}
        className="lg:hidden"
      />
      <CutoffChip
        cutoff={cutoff}
        href={READINESS_HREF}
        className="hidden shrink-0 lg:inline-flex"
      />
    </>
  );
}
