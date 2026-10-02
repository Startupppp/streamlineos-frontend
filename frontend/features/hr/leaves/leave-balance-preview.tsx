"use client";

import { AlertCircle, Info } from "lucide-react";
import { statusToneClasses } from "@/lib/design-tokens";

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

export function LeaveBalanceUnavailable({ typeName }: { typeName: string | null }) {
  const tone = statusToneClasses("neutral");
  return (
    <div
      className={`flex items-start gap-2.5 rounded-lg border p-3 ${tone.surface} ${tone.rule} ${tone.ink}`}
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <p className="text-dense">
        No balance is available for {typeName ?? "this leave type"} yet. You can
        still submit; your approver sees the balance your policy records.
      </p>
    </div>
  );
}

export function LeaveRequestHint({ message }: { message: string }) {
  const tone = statusToneClasses("warning");
  return (
    <div
      className={`flex items-start gap-2.5 rounded-lg border p-3 ${tone.surface} ${tone.rule} ${tone.ink}`}
      role="note"
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <p className="text-dense">{message}</p>
    </div>
  );
}

export function LeaveOverlapBlocked({ message }: { message: string }) {
  const tone = statusToneClasses("danger");
  return (
    <div
      className={`flex items-start gap-2.5 rounded-lg border p-3 ${tone.surface} ${tone.rule} ${tone.ink}`}
      role="alert"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <p className="text-dense">{message}</p>
    </div>
  );
}
