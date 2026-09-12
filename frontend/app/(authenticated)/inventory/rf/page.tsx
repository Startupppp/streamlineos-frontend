"use client";

import { Suspense, useCallback } from "react";
import Link from "next/link";
import { Boxes, ClipboardCheck, PackageCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { EmptyWarehouseIllustration } from "@/components/illustrations";
import { RfShell } from "@/features/inventory/components/rf/rf-shell";
import { useRfQueue, type RfTaskKind } from "@/hooks/api/inventory/rf-queue";

const KIND_ICON: Record<RfTaskKind, React.ComponentType<{ className?: string }>> = {
  PICK: PackageCheck,
  PUTAWAY: Boxes,
  COUNT: ClipboardCheck,
};

const KIND_LABEL: Record<RfTaskKind, string> = {
  PICK: "Pick",
  PUTAWAY: "Put away",
  COUNT: "Count",
};

/**
 * NEO-5 - the operator's queue.
 *
 * One column, one tap per task, no table. A supervisor's desktop lists are
 * untouched and remain where they were: this is the surface for the person
 * holding the scanner, and the two audiences want opposite things from the same
 * data.
 */
function RfQueueContent() {
  const { tasks, isLoading, isError, isDenied, refetch } = useRfQueue();

  const handleRetry = useCallback(() => refetch(), [refetch]);

  if (isDenied) {
    return (
      <RfShell title="My tasks">
        <NoPermissionState permission="inventory:stock:read" className="flex-1" />
      </RfShell>
    );
  }

  if (isLoading) {
    return (
      <RfShell title="My tasks">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      </RfShell>
    );
  }

  if (isError) {
    return (
      <RfShell title="My tasks">
        <ErrorState
          title="Could not load your tasks"
          description="The queue could not be fetched. Anything you have already confirmed is still safe on the device."
          onRetry={handleRetry}
        />
      </RfShell>
    );
  }

  return (
    <RfShell title="My tasks" subtitle={`${tasks.length} waiting`}>
      {tasks.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {tasks.map((task) => {
            const Icon = KIND_ICON[task.kind];
            return (
              <li key={`${task.kind}:${task.id}`}>
                <Link
                  href={task.href}
                  className="flex items-center gap-3 rounded-xl border border-border p-4 active:bg-muted"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-mono text-sm font-semibold">
                      {task.reference}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {task.summary}
                    </span>
                  </span>
                  <Badge variant="outline" className="text-dense shrink-0">
                    {KIND_LABEL[task.kind]}
                  </Badge>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <InventoryEmptyState
          illustration={<EmptyWarehouseIllustration />}
          title="Nothing assigned to you"
          description="Claim a wave or a putaway task from the operations screens, or wait for a supervisor to assign one."
        />
      )}
    </RfShell>
  );
}

export default function RfQueuePage() {
  return (
    <Suspense>
      <RfQueueContent />
    </Suspense>
  );
}
