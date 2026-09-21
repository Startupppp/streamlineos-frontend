"use client";

import type { ReactNode } from "react";
import { PmPanel } from "@/components/pm-chrome";
import { TEXT_ONE_LINE } from "@/lib/text-overflow";

export function ChartShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <PmPanel className="p-4">
      <h3 className={`mb-3 text-sm font-semibold ${TEXT_ONE_LINE}`}>{title}</h3>
      {children}
    </PmPanel>
  );
}
