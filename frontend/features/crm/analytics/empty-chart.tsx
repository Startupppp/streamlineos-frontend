"use client";

import { ChartEmptyState } from "@/components/charts/chart-empty-state";

export function EmptyChart({ message = "Nothing recorded for this period" }: { message?: string }) {
  return <ChartEmptyState message={message} />;
}
