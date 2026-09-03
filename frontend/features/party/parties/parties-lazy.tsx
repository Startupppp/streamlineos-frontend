"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * The party list's two overlays.
 *
 * Both are opened from a row or a toolbar button, and the form dialog is the
 * only thing on this route that reaches the record renderer's form — which is
 * what put react-hook-form, @hookform/resolvers and Zod in the list's first
 * load. They are mounted when they are asked for.
 */

function PartyDialogFallback({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 p-4"
    >
      <div className="flex w-full max-w-lg flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-panel">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-24 self-end" />
      </div>
    </div>
  );
}

function PartySheetFallback({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col gap-3 border-l border-border bg-card p-5 shadow-panel"
    >
      <Skeleton className="h-6 w-3/5" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

export const PartyFormDialog = dynamic(
  () => import("./party-form-dialog").then((m) => ({ default: m.PartyFormDialog })),
  { ssr: false, loading: () => <PartyDialogFallback label="Loading party form" /> },
);

export const PartyDetailSheet = dynamic(
  () => import("./party-detail-sheet").then((m) => ({ default: m.PartyDetailSheet })),
  { ssr: false, loading: () => <PartySheetFallback label="Loading party" /> },
);
