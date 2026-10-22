"use client";

import { useMemo } from "react";
import { applyAdjustment } from "@/lib/renderer/layout-adjustment";
import { useLayoutAdjustment } from "@/hooks/api/renderer/layouts";
import type { RecordLayout } from "@/lib/renderer/layout";

export function useTenantLayout(layout: RecordLayout): RecordLayout {
  const { data } = useLayoutAdjustment(layout.key);
  return useMemo(() => applyAdjustment(layout, data ?? null), [layout, data]);
}
