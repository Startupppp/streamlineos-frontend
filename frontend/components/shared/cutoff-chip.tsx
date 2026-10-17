"use client";

import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { statusToneClasses } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { presentCutoff, type PayrollCutoff } from "@/lib/hrms/payroll-cutoff";

interface CutoffChipProps {
  cutoff: PayrollCutoff | null | undefined;
  href?: string;
  className?: string;
}

export function CutoffChip({ cutoff, href, className }: CutoffChipProps) {
  if (!cutoff) return null;

  const presentation = presentCutoff(cutoff);
  if (!presentation) return null;

  const tone = statusToneClasses(presentation.tone);
  const body = (
    <>
      <CalendarClock className="h-3.5 w-3.5" aria-hidden />
      <span className="tabular-nums">{presentation.label}</span>
    </>
  );
  const chipClass = cn(
    "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-micro font-semibold",
    tone.surface,
    tone.inkStrong,
    tone.rule,
    className,
  );

  if (!href)
    return (
      <span className={chipClass} aria-label={`Payroll cutoff: ${presentation.label}`}>
        {body}
      </span>
    );

  return (
    <Link
      href={href}
      className={cn(chipClass, "transition-colors hover:brightness-95 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none")}
      aria-label={`Payroll cutoff: ${presentation.label}`}
    >
      {body}
    </Link>
  );
}
