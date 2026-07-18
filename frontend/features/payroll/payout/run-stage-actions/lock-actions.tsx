"use client";

import { useState } from "react";
import { toast } from "sonner";
import { LockOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LockIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { useCan } from "@/hooks/api/access";
import { useLockRun, useReopenRun, useCloseRun } from "@/hooks/api/payroll";
import { getErrorMessage } from "@/lib/get-error-message";

interface Props {
  runId: number;
  status: string;
  onChanged?: () => void;
}

function LockButton({ runId, onChanged }: { runId: number; onChanged?: () => void }) {
  const canManage = useCan("payroll:runs:manage");
  const [open, setOpen] = useState(false);
  const { mutate, isPending } = useLockRun();

  if (!canManage) return null;

  function handleOpen() { setOpen(true); }

  function handleConfirm() {
    mutate(
      { runId },
      {
        onSuccess: () => { setOpen(false); toast.success("Payroll locked"); onChanged?.(); },
        onError: (err) => { toast.error(getErrorMessage(err)); },
      },
    );
  }

  return (
    <>
      <AnimatedIconButton icon={LockIcon} iconSize={16} iconClassName="mr-1.5" size="sm" className="h-9" onClick={handleOpen}>
        Lock Payroll
      </AnimatedIconButton>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Lock Payroll Run?</AlertDialogTitle>
            <AlertDialogDescription>
              Locking freezes the calculation snapshot — payroll becomes immutable. No further edits
              will be allowed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={isPending}>
              {isPending ? "Locking…" : "Lock"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ReopenButton({ runId, onChanged }: { runId: number; onChanged?: () => void }) {
  const canManage = useCan("payroll:runs:manage");
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const { mutate, isPending } = useReopenRun();

  if (!canManage) return null;

  function handleOpen() { setOpen(true); }
  function handleOpenChange(val: boolean) { if (!val) { setReason(""); } setOpen(val); }

  function handleConfirm() {
    if (!reason.trim()) return;
    mutate(
      { runId, reason: reason.trim() },
      {
        onSuccess: () => { setOpen(false); setReason(""); toast.success("Run reopened"); onChanged?.(); },
        onError: (err) => { toast.error(getErrorMessage(err)); },
      },
    );
  }

  function handleReasonChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setReason(e.target.value);
  }

  return (
    <>
      <Button size="sm" variant="outline" className="h-9" onClick={handleOpen}>
        <LockOpen className="mr-2 h-4 w-4" /> Reopen Run
      </Button>
      <AlertDialog open={open} onOpenChange={handleOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reopen Payroll Run?</AlertDialogTitle>
            <AlertDialogDescription>
              Reopening undoes the lock and allows edits again. This action should only be taken if
              corrections are needed before final payment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Reason for reopening (required)…"
            value={reason}
            onChange={handleReasonChange}
            className="min-h-[80px] mx-6 mb-2"
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={isPending || !reason.trim()}>
              {isPending ? "Reopening…" : "Reopen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function CloseButton({ runId, onChanged }: { runId: number; onChanged?: () => void }) {
  const canManage = useCan("payroll:runs:manage");
  const [open, setOpen] = useState(false);
  const { mutate, isPending } = useCloseRun();

  if (!canManage) return null;

  function handleOpen() { setOpen(true); }

  function handleConfirm() {
    mutate(
      { runId },
      {
        onSuccess: () => { setOpen(false); toast.success("Run closed"); onChanged?.(); },
        onError: (err) => { toast.error(getErrorMessage(err)); },
      },
    );
  }

  return (
    <>
      <Button size="sm" variant="outline" className="h-9" onClick={handleOpen}>
        Close Run
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close Payroll Run?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently close the payroll run. No further changes will be possible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={isPending}>
              {isPending ? "Closing…" : "Close Run"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function LockActions({ runId, status, onChanged }: Props) {
  if (status === "APPROVED") return <LockButton runId={runId} onChanged={onChanged} />;
  if (status === "LOCKED") return <ReopenButton runId={runId} onChanged={onChanged} />;
  if (status === "PAYSLIPS_PUBLISHED") return <CloseButton runId={runId} onChanged={onChanged} />;
  return null;
}
