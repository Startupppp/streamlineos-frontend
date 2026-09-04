"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { usePaymentReadiness, useActivateLivePayments } from "@/hooks/api/payments";
import { useCan } from "@/hooks/api/access";

const CONFIRM_PHRASE = "ACTIVATE LIVE";

export function LiveActivationPanel({ providerKey }: { providerKey: string }) {
  const canActivate = useCan("payments:live:activate");
  const {
    data: readiness,
    isError: readinessFailed,
    error: readinessError,
    refetch: refetchReadiness,
  } = usePaymentReadiness(providerKey);
  const activate = useActivateLivePayments(providerKey);
  const [confirmText, setConfirmText] = useState("");

  function handleRetryReadiness() {
    void refetchReadiness();
  }

  if (!canActivate) return null;

  // Readiness is the gate on this panel's own button. A failed read must not
  // disappear the panel: silence there is indistinguishable from "this
  // provider cannot go live", and the operator has no way to tell.
  if (readinessFailed) {
    return (
      <ErrorState
        compact
        title="Failed to load live readiness"
        description={getErrorMessage(readinessError)}
        onRetry={handleRetryReadiness}
      />
    );
  }

  if (!readiness) return null;

  function handleConfirmTextChange(e: React.ChangeEvent<HTMLInputElement>) {
    setConfirmText(e.target.value);
  }

  function handleCancelActivation() {
    setConfirmText("");
  }

  function handleActivate() {
    activate.mutate(undefined, {
      onSuccess: () => {
        toast.success("Live payments activated");
        setConfirmText("");
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 text-status-warning-ink" />
        <p className="text-sm font-semibold text-foreground">Activate live payments</p>
      </div>
      <p className="text-xs text-muted-foreground">
        Live payments can charge real customers. Confirm that business details, webhook, tax
        settings, and refund policy are correct.
      </p>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button size="sm" disabled={!readiness.readyForLive} className="text-xs">
            Activate live payments
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activate live payments?</AlertDialogTitle>
            <AlertDialogDescription>
              This starts charging real customers with real money. Type{" "}
              <span className="font-mono font-semibold text-foreground">{CONFIRM_PHRASE}</span> to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-activate" className="sr-only">Confirmation</Label>
            <Input
              id="confirm-activate"
              value={confirmText}
              onChange={handleConfirmTextChange}
              placeholder={CONFIRM_PHRASE}
              className="text-sm font-mono"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelActivation}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={confirmText !== CONFIRM_PHRASE || activate.isPending}
              onClick={handleActivate}
            >
              Activate live payments
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {!readiness.readyForLive && (
        <p className="text-dense text-muted-foreground">
          Resolve the blockers listed in the readiness panel before activating.
        </p>
      )}
    </div>
  );
}
