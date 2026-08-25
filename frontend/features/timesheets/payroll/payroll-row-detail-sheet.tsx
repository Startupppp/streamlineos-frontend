"use client";

import { memo, useCallback } from "react";
import Link from "next/link";
import { TruncatedText } from "@/components/ui/truncated-text";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/common/use-mobile";
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

const StatRow = memo(function StatRow({ label, value, highlight }: StatRowProps) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-xs font-mono tabular-nums ${highlight ? "font-semibold text-foreground" : "text-foreground"}`}>
        {value}
      </span>
    </div>
  );
});

function DetailBody({ row }: { row: PayrollSummaryRow }) {
  return (
    <div className="space-y-5 px-6 py-5">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-border bg-primary/5 p-3 text-center">
          <p className="text-dense text-muted-foreground">Payable</p>
          <p className="text-lg font-semibold tabular-nums text-foreground">{row.totalPayableHours.toFixed(1)}</p>
          <p className="text-micro text-muted-foreground">hours</p>
        </div>
        <div className="rounded-lg border border-border bg-status-warning-surface p-3 text-center">
          <p className="text-dense text-muted-foreground">Overtime</p>
          <p className="text-lg font-semibold tabular-nums text-status-warning-ink">{row.overtimeHours.toFixed(1)}</p>
          <p className="text-micro text-muted-foreground">hours</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <p className="text-dense text-muted-foreground">Entries</p>
          <p className="text-lg font-semibold tabular-nums">{row.entryCount}</p>
          <p className="text-micro text-muted-foreground">logged</p>
        </div>
      </div>

      {row.hasPendingEntries && (
        <div className="rounded-lg border border-status-warning-rule bg-status-warning-surface px-4 py-3">
          <p className="text-xs text-status-warning-ink">
            <span className="font-semibold">{row.pendingHours.toFixed(1)} h</span> pending approval — excluded from this total.{" "}
            <Link href="/timesheets/team" className="underline underline-offset-2">
              Review
            </Link>
          </p>
        </div>
      )}

      <div>
        <p className="text-dense font-medium text-muted-foreground uppercase tracking-wider mb-2">
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
          <Badge variant="outline" className="border-status-warning-rule bg-status-warning-surface text-status-warning-ink text-micro">
            Pending entries
          </Badge>
        )}
        {row.totalPayableHours > 0 && !row.hasPendingEntries && (
          <Badge variant="outline" className="border-status-success-rule bg-status-success-surface text-status-success-ink text-micro">
            Ready
          </Badge>
        )}
      </div>
    </div>
  );
}

export function PayrollRowDetailSheet({
  row,
  open,
  onOpenChange,
}: PayrollRowDetailSheetProps) {
  const isMobile = useIsMobile();
  const handleClose = useCallback(() => onOpenChange(false), [onOpenChange]);

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
        <DrawerContent className="max-h-[92dvh]">
          <DrawerHeader className="border-b px-6 py-4 text-left gap-0.5">
            <DrawerTitle className="text-base leading-tight">
              <TruncatedText text={row?.userName ?? "Employee"} />
            </DrawerTitle>
            {row && (
              <TruncatedText text={row.userEmail ?? ""} className="text-xs text-muted-foreground" />
            )}
          </DrawerHeader>
          <ScrollArea className="flex-1 min-h-0">
            {row && <DetailBody row={row} />}
          </ScrollArea>
          <DrawerFooter className="border-t px-6 py-4">
            <Button variant="outline" className="w-full" onClick={handleClose}>
              Close
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="p-0 flex flex-col gap-0 overflow-hidden sm:max-w-lg">
        <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
          <SheetTitle className="text-base leading-tight">
            <TruncatedText text={row?.userName ?? "Employee"} />
          </SheetTitle>
          {row && (
            <TruncatedText text={row.userEmail ?? ""} className="text-xs text-muted-foreground" />
          )}
        </SheetHeader>

        <SheetBody className="px-6 py-5 space-y-5">
          {row && <DetailBody row={row} />}
        </SheetBody>

        <SheetFooter className="border-t px-6 py-4">
          <Button variant="outline" className="w-full" onClick={handleClose}>
            Close
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
