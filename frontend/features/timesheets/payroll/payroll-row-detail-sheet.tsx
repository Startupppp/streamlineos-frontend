"use client";

import { useCallback } from "react";
import Link from "next/link";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PayrollSummaryRow } from "./types";

interface PayrollRowDetailSheetProps {
  row: PayrollSummaryRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface StatRowProps {
  label: string;
  value: string;
  highlight?: boolean;
}

function StatRow({ label, value, highlight }: StatRowProps) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-xs font-mono tabular-nums ${highlight ? "font-semibold text-foreground" : "text-foreground"}`}>
        {value}
      </span>
    </div>
  );
}

export function PayrollRowDetailSheet({
  row,
  open,
  onOpenChange,
}: PayrollRowDetailSheetProps) {
  const handleClose = useCallback(() => onOpenChange(false), [onOpenChange]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="p-0 flex flex-col gap-0 sm:max-w-lg">
        <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
          <SheetTitle className="text-base leading-tight truncate">
            {row?.userName ?? "Employee"}
          </SheetTitle>
          {row && (
            <p className="text-xs text-muted-foreground truncate">{row.userEmail}</p>
          )}
        </SheetHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-5">
          {row && (
            <>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg border border-border bg-blue-50 p-3 text-center">
                  <p className="text-[11px] text-muted-foreground">Payable</p>
                  <p className="text-lg font-semibold tabular-nums text-blue-700">{row.totalPayableHours.toFixed(1)}</p>
                  <p className="text-[10px] text-muted-foreground">hours</p>
                </div>
                <div className="rounded-lg border border-border bg-amber-50 p-3 text-center">
                  <p className="text-[11px] text-muted-foreground">Overtime</p>
                  <p className="text-lg font-semibold tabular-nums text-amber-700">{row.overtimeHours.toFixed(1)}</p>
                  <p className="text-[10px] text-muted-foreground">hours</p>
                </div>
                <div className="rounded-lg border border-border bg-card p-3 text-center">
                  <p className="text-[11px] text-muted-foreground">Entries</p>
                  <p className="text-lg font-semibold tabular-nums">{row.entryCount}</p>
                  <p className="text-[10px] text-muted-foreground">logged</p>
                </div>
              </div>

              {row.hasPendingEntries && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-xs text-amber-800">
                    <span className="font-semibold">{row.pendingHours.toFixed(1)} h</span> pending approval — excluded from this total.{" "}
                    <Link href="/timesheets/team" className="underline underline-offset-2">
                      Review
                    </Link>
                  </p>
                </div>
              )}

              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Hour Breakdown
                </p>
                <div className="rounded-lg border border-border bg-card px-3">
                  <StatRow label="Regular" value={`${row.regularHours.toFixed(1)} h`} />
                  <StatRow label="Overtime" value={`${row.overtimeHours.toFixed(1)} h`} />
                  <StatRow label="Holiday" value={`${row.holidayHours.toFixed(1)} h`} />
                  <StatRow label="Weekend" value={`${row.weekendHours.toFixed(1)} h`} />
                  <StatRow label="Break" value={`${row.breakHours.toFixed(1)} h`} />
                  <StatRow label="Leave days" value={String(row.leaveDays)} />
                  <StatRow label="Billable" value={`${row.billableHours.toFixed(1)} h`} />
                  <StatRow label="Non-billable" value={`${row.nonBillableHours.toFixed(1)} h`} />
                  <StatRow label="Already exported" value={`${row.exportedHours.toFixed(1)} h`} />
                  <StatRow label="Total payable" value={`${row.totalPayableHours.toFixed(1)} h`} highlight />
                </div>
              </div>

              <div className="flex items-center gap-2">
                {row.hasPendingEntries && (
                  <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 text-[10px]">
                    Pending entries
                  </Badge>
                )}
                {row.totalPayableHours > 0 && !row.hasPendingEntries && (
                  <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 text-[10px]">
                    Ready
                  </Badge>
                )}
              </div>
            </>
          )}
        </div>

        <div className="shrink-0 border-t px-6 py-4">
          <Button
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs"
            onClick={handleClose}
          >
            Close
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
