"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { SheetFooter } from "@/components/ui/sheet";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useCan } from "@/hooks/api/access";
import { usePeriodLifecycle } from "@/hooks/api/timesheets-core/periods";
import type { TimesheetPeriod } from "@/features/timesheets/types";

type LifecycleAction = "lock" | "unlock" | "reopen";

const CONFIRM: Record<LifecycleAction, { title: string; description: string; label: string }> = {
  lock: {
    title: "Lock this timesheet?",
    description: "Entries in a locked period cannot be edited until it is unlocked or reopened.",
    label: "Lock",
  },
  unlock: {
    title: "Unlock this timesheet?",
    description: "The period returns to Approved. Its entries stay approved.",
    label: "Unlock",
  },
  reopen: {
    title: "Reopen this timesheet?",
    description:
      "The period goes back to Draft and its approval is cleared. The worker must edit and resubmit it.",
    label: "Reopen",
  },
};

interface PeriodLifecycleActionsProps {
  period: TimesheetPeriod;
  onDone: () => void;
}

/**
 * Lock / unlock / reopen for an approved or locked period. The backend allows
 * lock only from APPROVED, unlock only from LOCKED and reopen from either, so the
 * offered actions follow the status rather than letting the server refuse them.
 */
export function PeriodLifecycleActions({ period, onDone }: PeriodLifecycleActionsProps) {
  const canManage = useCan("timesheets:approvals:manage");
  const [pending, setPending] = useState<LifecycleAction | null>(null);
  const lock = usePeriodLifecycle("lock");
  const unlock = usePeriodLifecycle("unlock");
  const reopen = usePeriodLifecycle("reopen");
  const mutations = { lock, unlock, reopen };

  const handleLock = useCallback(() => setPending("lock"), []);
  const handleUnlock = useCallback(() => setPending("unlock"), []);
  const handleReopen = useCallback(() => setPending("reopen"), []);
  const handleConfirmOpenChange = useCallback((open: boolean) => {
    if (!open) setPending(null);
  }, []);

  const active = pending ? mutations[pending] : null;
  const handleConfirm = () => {
    if (!pending || !active) return;
    active.mutate(period.id, {
      onSuccess: () => {
        setPending(null);
        onDone();
      },
    });
  };

  if (!canManage || (period.status !== "APPROVED" && period.status !== "LOCKED")) return null;
  const isBusy = lock.isPending || unlock.isPending || reopen.isPending;

  return (
    <SheetFooter className="flex-row gap-2 border-t px-6 py-4">
      {period.status === "APPROVED" ? (
        <Button type="button" size="sm" className="flex-1" onClick={handleLock} disabled={isBusy}>
          Lock
        </Button>
      ) : (
        <Button type="button" size="sm" className="flex-1" onClick={handleUnlock} disabled={isBusy}>
          Unlock
        </Button>
      )}
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="flex-1"
        onClick={handleReopen}
        disabled={isBusy}
      >
        Reopen
      </Button>
      <ConfirmDialog
        open={pending !== null}
        onOpenChange={handleConfirmOpenChange}
        title={pending ? CONFIRM[pending].title : ""}
        description={pending ? CONFIRM[pending].description : ""}
        confirmLabel={pending ? CONFIRM[pending].label : ""}
        destructive={pending === "reopen"}
        onConfirm={handleConfirm}
        isPending={active?.isPending ?? false}
        keepOpenOnConfirm
      />
    </SheetFooter>
  );
}
