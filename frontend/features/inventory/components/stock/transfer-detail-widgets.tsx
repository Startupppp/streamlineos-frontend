"use client";

import { Check } from "lucide-react";
import type { TransferDetail, TransferStatus } from "@/hooks/api/inventory/transfers";
import { TRANSFER_STATUS_LABEL } from "@/features/inventory/lib";
import { cn } from "@/lib/utils";

export function StatusTimeline({ status }: { status: TransferStatus }) {
  const steps: TransferStatus[] =
    status === "CANCELLED"
      ? ["PENDING", "RESERVED", "IN_TRANSIT", "CANCELLED"]
      : ["PENDING", "RESERVED", "IN_TRANSIT", "COMPLETED"];

  const currentIdx = steps.indexOf(status);

  return (
    <div className="flex items-center px-2 py-3">
      {steps.map((step, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        const cancelled = active && step === "CANCELLED";
        return (
          <div key={step} className="contents">
            {i > 0 && (
              <div className={cn("h-px flex-1 mx-2", done ? "bg-primary/40" : "bg-border")} />
            )}
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "h-7 w-7 rounded-full border-2 flex items-center justify-center shrink-0",
                  done && "bg-primary border-primary text-primary-foreground",
                  active && !cancelled && "border-primary bg-primary/10 text-foreground",
                  cancelled && "border-red-400 bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
                  !done && !active && "border-border bg-background text-muted-foreground",
                )}
              >
                {done ? (
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <span className="text-[11px] font-semibold">{i + 1}</span>
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium",
                  done
                    ? "text-foreground"
                    : active && !cancelled
                    ? "text-primary"
                    : cancelled
                    ? "text-red-600 dark:text-red-400"
                    : "text-muted-foreground",
                )}
              >
                {TRANSFER_STATUS_LABEL[step]}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function LocationCell({
  location,
  label,
}: {
  location: TransferDetail["fromLocation"];
  label: string;
}) {
  if (!location) {
    return (
      <div>
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
          {label}
        </p>
        <p className="text-sm text-muted-foreground">—</p>
      </div>
    );
  }
  return (
    <div>
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
        {label}
      </p>
      {location.warehouse && (
        <p className="text-sm font-semibold text-foreground">{location.warehouse.name}</p>
      )}
      <p className="text-xs text-muted-foreground">
        {location.name} <span className="font-mono">({location.code})</span>
      </p>
    </div>
  );
}
