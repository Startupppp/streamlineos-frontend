"use client";

import type { ReactNode } from "react";
import { PmPanel } from "@/components/pm-chrome";
import { TEXT_ONE_LINE } from "@/lib/text-overflow";

interface ChartShellProps {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function ChartShell({ title, actions, children }: ChartShellProps) {
  return (
    <PmPanel className="p-4">
      <div className="mb-3 flex min-w-0 items-center justify-between gap-2">
        <h3 className={`min-w-0 text-sm font-medium ${TEXT_ONE_LINE}`}>{title}</h3>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      {children}
    </PmPanel>
  );
}
