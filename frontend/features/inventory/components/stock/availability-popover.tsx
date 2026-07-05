"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { AppSheet } from "@/components/shared/app-sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useStockAvailability } from "@/hooks/api/inventory/stock";
import { cn } from "@/lib/utils";

interface AvailabilityPopoverProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  variantId: number | null;
  variantName?: string;
}

const TH = "text-[10px] uppercase tracking-wider font-bold px-2 py-1.5";

const NUM = "px-2 py-1 text-right font-mono tabular-nums text-[11px]";

function MetricRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("text-xs font-mono tabular-nums", highlight && "font-semibold text-foreground")}>
        {Number(value).toLocaleString(undefined, { maximumFractionDigits: 4 })}
      </span>
    </div>
  );
}

export function AvailabilityPopover({ open, onOpenChange, variantId, variantName }: AvailabilityPopoverProps) {
  const { data, isLoading } = useStockAvailability(variantId ?? 0);

  const title = variantName ? `Availability — ${variantName}` : "Stock Availability";

  return (
    <AppSheet open={open} onOpenChange={onOpenChange} title={title} className="sm:max-w-md">
      {isLoading ? (
        <div className="p-6 space-y-2">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </div>
      ) : !data ? (
        <div className="p-6 text-sm text-muted-foreground">No availability data found.</div>
      ) : (
        <div className="p-6 space-y-5">
          <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 space-y-0">
            <MetricRow label="On Hand" value={data.onHand} />
            <MetricRow label="Committed" value={data.committed} />
            <MetricRow label="Incoming (Open POs)" value={data.incoming} />
            <MetricRow label="Outgoing (Open SOs)" value={data.outgoing} />
            <MetricRow label="Available (ATP)" value={data.available} highlight />
            <MetricRow label="Forecasted" value={data.forecasted} />
          </div>

          {data.warehouseBreakdown.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                By Warehouse
              </p>
              <div className="rounded-md border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/80 hover:bg-muted/80">
                      <TableHead className={TH}>Warehouse</TableHead>
                      <TableHead className={cn(TH, "text-right")}>On Hand</TableHead>
                      <TableHead className={cn(TH, "text-right")}>Committed</TableHead>
                      <TableHead className={cn(TH, "text-right")}>Available</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.warehouseBreakdown.map((row) => (
                      <TableRow key={row.warehouse_id} className="h-7 border-b border-border/50">
                        <TableCell className="px-2 py-1 text-[11px] font-medium">{row.warehouse_name}</TableCell>
                        <TableCell className={cn(NUM, "text-muted-foreground")}>
                          {Number(row.on_hand).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                        </TableCell>
                        <TableCell className={cn(NUM, "text-muted-foreground")}>
                          {Number(row.committed).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                        </TableCell>
                        <TableCell className={cn(NUM, "font-semibold text-emerald-700")}>
                          {Number(row.available).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {data.warehouseBreakdown.length === 0 && (
            <p className="text-xs text-muted-foreground">No warehouse breakdown available.</p>
          )}
        </div>
      )}
    </AppSheet>
  );
}
