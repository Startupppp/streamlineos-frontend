"use client";

import { ChartEmptyState } from "@/components/charts/chart-empty-state";

export function EmptyChart({ message = "No data available" }: { message?: string }) {
  return <ChartEmptyState message={message} />;
}
