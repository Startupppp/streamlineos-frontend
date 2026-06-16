"use client";

import { BarChart3 } from "lucide-react";

export function EmptyChart({ message = "No data available" }: { message?: string }) {
  return (
    <div className="flex h-[280px] flex-col items-center justify-center text-center">
      <BarChart3 className="mb-2 h-8 w-8 text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
