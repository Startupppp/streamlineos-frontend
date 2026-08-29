"use client";

import { useRouter } from "next/navigation";
import { CONTENT_PANEL_SOLID } from "@/components/ui/content-fill-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyChartIllustration } from "@/components/illustrations";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { statusToneClasses } from "@/lib/design-tokens";
import { useWorkAging, type AgeBand, type WorkAging, type WorkAgingLane } from "@/hooks/api/inventory/operations-metrics";

/**
 * B10 — how old the open work is.
 *
 * Throughput answers "how much moved in this window", and it cannot answer "what
 * has been sitting here since Tuesday": a lane processing a hundred lines a day
 * with one receipt stuck for a week looks healthy by volume. The bands are the
 * part a supervisor acts on, which is why the drill-through carries the lane
 * rather than dropping the reader on an unfiltered list.
 */

interface Lane {
  key: keyof Pick<WorkAging, "receipts" | "putaway" | "picking" | "pickExceptions" | "shipping">;
  label: string;
  href: string;
}

const LANES: Lane[] = [
  { key: "receipts", label: "Receipts", href: "/inventory/operations/receipts" },
  { key: "putaway", label: "Putaway", href: "/inventory/operations/putaway" },
  { key: "picking", label: "Picking", href: "/inventory/operations/picking" },
  { key: "pickExceptions", label: "Pick exceptions", href: "/inventory/operations/picking?tab=exceptions" },
  { key: "shipping", label: "Shipping", href: "/inventory/operations/shipping" },
];

/**
 * The oldest band with anything in it decides the lane's tone — not the total.
 *
 * A lane with eighty items all under four hours is busy and fine; a lane with one
 * item three days old is not. Colouring by volume would say the opposite of what
 * the reader needs.
 *
 * Ranked by label rather than by position, so the colour does not depend on the
 * order the API happened to serialise the bands in: the type pins the four labels
 * and says nothing about their order, and a reordering upstream would otherwise
 * turn a three-day backlog green.
 */
const BAND_SEVERITY: Record<AgeBand["label"], number> = {
  "72h+": 3,
  "24-72h": 2,
  "4-24h": 1,
  "0-4h": 0,
};

function laneTone(lane: WorkAgingLane): "success" | "warning" | "danger" | "neutral" {
  if (lane.open === 0) return "neutral";
  const worst = lane.bands
    .filter((band) => band.count > 0)
    .reduce<AgeBand | null>(
      (acc, band) =>
        acc === null || BAND_SEVERITY[band.label] > BAND_SEVERITY[acc.label] ? band : acc,
      null,
    );
  if (!worst) return "neutral";
  if (worst.label === "72h+") return "danger";
  if (worst.label === "24-72h") return "warning";
  return "success";
}

function BandCell({ band }: { band: AgeBand }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-muted-foreground text-xs font-medium">{band.label}</span>
      <span className="font-mono text-sm tabular-nums">{band.count}</span>
    </div>
  );
}

interface WorkAgingPanelProps {
  warehouseId?: number;
  className?: string;
}

export function WorkAgingPanel({ warehouseId, className }: WorkAgingPanelProps) {
  const router = useRouter();
  const { data, isLoading, isError, error, refetch } = useWorkAging({ warehouseId });

  function handleRetry(): void {
    void refetch();
  }

  if (isLoading) {
    return (
      <section className={cn(CONTENT_PANEL_SOLID, "p-4", className)}>
        <Skeleton className="mb-3 h-5 w-40" />
        <div className="flex flex-col gap-2">
          {LANES.map((lane) => (
            <Skeleton key={lane.key} className="h-12 w-full" />
          ))}
        </div>
      </section>
    );
  }

  if (isError) {
    return (
      <section className={cn(CONTENT_PANEL_SOLID, "p-4", className)}>
        <ErrorState
          title="Couldn't load open work"
          description={getErrorMessage(error)}
          onRetry={handleRetry}
        />
      </section>
    );
  }

  if (!data) return null;

  /**
   * The distinction this panel exists to preserve.
   *
   * An empty `scopedWarehouseIds` means the reader is assigned no warehouse, so
   * every count below is zero for a reason that has nothing to do with the
   * warehouse being idle. Rendering the same all-zero cards for both tells
   * somebody their queue is clear when in fact they cannot see any queue — and
   * the throughput report above already makes exactly that mistake.
   */
  if (data.scopedWarehouseIds !== null && data.scopedWarehouseIds.length === 0) {
    return (
      <section className={cn(CONTENT_PANEL_SOLID, "p-4", className)}>
        <EmptyState
          illustration={<EmptyChartIllustration />}
          title="You are not assigned to a warehouse"
          description="Open work is scoped to the warehouses you are assigned to, and you have none. This is not an empty queue — ask an inventory administrator to assign you a site."
        />
      </section>
    );
  }

  const totalOpen = LANES.reduce((sum, lane) => sum + data[lane.key].open, 0);

  return (
    <section className={cn(CONTENT_PANEL_SOLID, "p-4", className)}>
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Open work by age</h2>
        <span className="text-muted-foreground text-xs">
          {data.scopedWarehouseIds === null
            ? "All warehouses"
            : `${data.scopedWarehouseIds.length} warehouse${data.scopedWarehouseIds.length === 1 ? "" : "s"}`}
        </span>
      </header>

      {totalOpen === 0 ? (
        <EmptyState
          compact
          illustration={<EmptyChartIllustration />}
          title="Nothing open"
          description="Every receipt, putaway, pick and shipment in scope has been closed."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {LANES.map((lane) => {
            const value = data[lane.key];
            const tone = laneTone(value);
            const toneClasses = statusToneClasses(tone);
            function handleDrillThrough(): void {
              router.push(lane.href);
            }
            return (
              <button
                key={lane.key}
                type="button"
                onClick={handleDrillThrough}
                className="hover:border-primary/40 flex items-center gap-4 rounded-lg border border-border bg-card px-3 py-2.5 text-left transition-all hover:shadow-md"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="truncate text-sm font-medium">{lane.label}</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "h-5 px-2 py-0.5 text-xs",
                      // `statusToneClasses` returns an object keyed by role, not
                      // a class string. Handing it straight to `cn()` emits the
                      // role *names* — "surface ink inkStrong rule fill" — as
                      // class names, which silently produces an unstyled badge.
                      toneClasses.surface,
                      toneClasses.ink,
                      toneClasses.rule,
                    )}
                  >
                    {value.open} open
                  </Badge>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  {value.bands.map((band) => (
                    <BandCell key={band.label} band={band} />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
