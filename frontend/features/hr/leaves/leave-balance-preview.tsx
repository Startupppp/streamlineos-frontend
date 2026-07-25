"use client";

import { AlertCircle } from "lucide-react";

interface BalancePreview {
  available: number;
  after: number;
  typeName: string;
}

export function LeaveBalancePreview({
  preview,
  requestedDays,
}: {
  preview: BalancePreview;
  requestedDays: number;
}) {
  if (requestedDays <= 0) return null;

  return (
    <div
      className={`flex items-start gap-2.5 p-3 rounded-lg border text-xs ${
        preview.after < 0
          ? "bg-destructive/10 border-destructive/20 text-destructive"
          : "bg-muted/50 border-border text-foreground"
      }`}
    >
      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
      <span>
        This will consume{" "}
        <strong>
          {requestedDays} day{requestedDays !== 1 ? "s" : ""}
        </strong>{" "}
        of your{" "}
        <strong>
          {preview.available} remaining {preview.typeName} days.
        </strong>
        {preview.after >= 0 ? (
          <>
            {" "}
            You will have{" "}
            <strong>
              {preview.after} day{preview.after !== 1 ? "s" : ""}
            </strong>{" "}
            left.
          </>
        ) : (
          <>
            {" "}
            This exceeds your balance by{" "}
            <strong>
              {Math.abs(preview.after)} day
              {Math.abs(preview.after) !== 1 ? "s" : ""}.
            </strong>
          </>
        )}
      </span>
    </div>
  );
}

export function LeaveLimitError({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2.5 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
      <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
      <p className="text-xs text-destructive">{message}</p>
    </div>
  );
}
