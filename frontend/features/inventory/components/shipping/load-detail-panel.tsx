"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ErrorState } from "@/components/shared";
import { LoadingButton } from "@/components/ui/loading-button";
import { LOAD_STATUS_BADGE, LOAD_STATUS_LABEL } from "@/features/inventory/lib";
import {
  useLoad,
  useDispatchLoad,
  useCloseLoad,
  useCancelLoad,
} from "@/hooks/api/inventory/shipping";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";

function formatDate(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

export interface LoadDetailPanelProps {
  loadId: number;
  onClose: () => void;
}

const CONFIRM_LABELS = {
  dispatch: {
    title: "Dispatch Load",
    description: "Mark this load as dispatched. All members must be SHIPPED or IN_TRANSIT.",
    action: "Dispatch",
  },
  close: {
    title: "Close Load",
    description: "Mark this load as arrived and closed.",
    action: "Close",
  },
  cancel: {
    title: "Cancel Load",
    description: "Cancel this load. Only DRAFT loads can be cancelled.",
    action: "Cancel",
  },
} as const;

type ConfirmAction = keyof typeof CONFIRM_LABELS;

export function LoadDetailPanel({ loadId, onClose }: LoadDetailPanelProps) {
  const loadQuery = useLoad(loadId);
  const dispatchMutation = useDispatchLoad();
  const closeMutation = useCloseLoad();
  const cancelMutation = useCancelLoad();
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  function handleOpenDispatch(): void {
    setConfirmAction("dispatch");
  }

  function handleOpenClose(): void {
    setConfirmAction("close");
  }

  function handleOpenCancel(): void {
    setConfirmAction("cancel");
  }

  function handleDismissConfirm(): void {
    setConfirmAction(null);
  }

  function handleConfirmAction(): void {
    if (!loadQuery.data) return;
    const id = loadQuery.data.id;
    if (confirmAction === "dispatch") {
      dispatchMutation.mutate(id, {
        onSuccess: () => {
          toast.success("Load dispatched");
          setConfirmAction(null);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      });
    } else if (confirmAction === "close") {
      closeMutation.mutate(id, {
        onSuccess: () => {
          toast.success("Load closed");
          setConfirmAction(null);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      });
    } else if (confirmAction === "cancel") {
      cancelMutation.mutate(id, {
        onSuccess: () => {
          toast.success("Load cancelled");
          setConfirmAction(null);
          onClose();
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      });
    }
  }

  const load = loadQuery.data;
  const isPending =
    dispatchMutation.isPending || closeMutation.isPending || cancelMutation.isPending;

  if (loadQuery.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  function handleRetryLoad(): void {
    void loadQuery.refetch();
  }

  if (loadQuery.error || !load) {
    return (
      <ErrorState
        title="Failed to load details"
        description={loadQuery.error != null ? getErrorMessage(loadQuery.error) : "Load not found"}
        onRetry={handleRetryLoad}
      />
    );
  }

  return (
    <>
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn("h-4 text-[9px] px-1.5 py-0 border", LOAD_STATUS_BADGE[load.status])}
          >
            {LOAD_STATUS_LABEL[load.status]}
          </Badge>
          <span className="text-xs text-muted-foreground">{formatDate(load.createdAt)}</span>
        </div>

        {load.name && (
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Name</p>
            <p className="text-sm font-medium">{load.name}</p>
          </div>
        )}

        <div>
          <p className="text-xs text-muted-foreground mb-2">Members ({load.members?.length ?? 0})</p>
          {load.members && load.members.length > 0 ? (
            <div className="divide-y divide-border rounded-lg border">
              {load.members.map((member) => (
                <div key={member.id} className="flex items-center justify-between px-3 py-2">
                  <div>
                    <span className="text-xs text-muted-foreground">{member.type}</span>
                    <span className="ml-2 text-sm font-mono">#{member.referenceId}</span>
                  </div>
                  {member.status && (
                    <span className="text-xs text-muted-foreground">{member.status}</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No members</p>
          )}
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          {(load.status === "DRAFT" || load.status === "DISPATCHED") && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleOpenDispatch}
              disabled={isPending}
            >
              Dispatch
            </Button>
          )}
          {load.status === "ARRIVED" && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleOpenClose}
              disabled={isPending}
            >
              Close Load
            </Button>
          )}
          {load.status === "DRAFT" && (
            <Button
              size="sm"
              variant="destructive"
              onClick={handleOpenCancel}
              disabled={isPending}
            >
              Cancel
            </Button>
          )}
        </div>
      </div>

      {confirmAction && (
        <AlertDialog open onOpenChange={handleDismissConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{CONFIRM_LABELS[confirmAction].title}</AlertDialogTitle>
              <AlertDialogDescription>
                {CONFIRM_LABELS[confirmAction].description}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleDismissConfirm}>Cancel</AlertDialogCancel>
              <AlertDialogAction asChild>
                <LoadingButton onClick={handleConfirmAction} isPending={isPending} loadingText="Processing…">
                  {CONFIRM_LABELS[confirmAction].action}
                </LoadingButton>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
