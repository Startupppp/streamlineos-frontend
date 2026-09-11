"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ReportBuilderSectionProps {
  title: string;
  /** The bound this section is held to, said where the control is, not after a refusal. */
  hint?: string;
  description?: string;
  className?: string;
  children: ReactNode;
}

export function ReportBuilderSection({
  title,
  hint,
  description,
  className,
  children,
}: ReportBuilderSectionProps) {
  return (
    <section className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        {hint ? <span className="text-xs tabular-nums text-muted-foreground">{hint}</span> : null}
      </div>
      {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      {children}
    </section>
  );
}
