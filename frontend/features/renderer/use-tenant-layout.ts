"use client";

import { useMemo } from "react";
import { applyAdjustment } from "@/lib/renderer/layout-adjustment";
import { useLayoutAdjustment } from "@/hooks/api/renderer/layouts";
import type { RecordLayout } from "@/lib/renderer/layout";

/**
 * A description with this tenant's arrangement applied.
 *
 * Every record surface calls this instead of handing the renderer a layout
 * directly, which is what makes an arrangement universal rather than a feature
 * of one screen. What comes back is an ordinary `RecordLayout`, so the list, the
 * detail view, the generated schema and the form carry on knowing nothing about
 * tenants — there is no second rendering path for an adjusted layout, and an
 * arrangement therefore cannot render differently from a stock one.
 *
 * Before a session resolves, or while the arrangement is still in flight, the
 * description renders as declared. A screen that flashed one arrangement and
 * then rearranged itself under the reader would be worse than one that never
 * adjusted at all.
 */
export function useTenantLayout(layout: RecordLayout): RecordLayout {
  const { data } = useLayoutAdjustment(layout.key);
  return useMemo(() => applyAdjustment(layout, data ?? null), [layout, data]);
}
