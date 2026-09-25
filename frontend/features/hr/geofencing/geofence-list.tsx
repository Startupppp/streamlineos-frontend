"use client";

import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import { Edit2 } from "lucide-react";
import { Trash2Icon } from "@animateicons/react/lucide";
import { TooltipIconButton } from "@/components/ui/tooltip-icon-button";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useGeofences, useDeleteGeofence, type Geofence } from "@/hooks/api/hr/geofencing";
import { TruncatedText } from "@/components/ui/truncated-text";

interface Props {
  canManage: boolean;
  onEdit: (fence: Geofence) => void;
}

export function GeofenceList({ canManage, onEdit }: Props) {
  const { data: fences, isLoading, isError, error, refetch } = useGeofences();
  const deleteFence = useDeleteGeofence();

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  // Delete fired from the icon with no confirmation (FE-83).
  const [pendingDelete, setPendingDelete] = useState<Geofence | null>(null);
  function handleDeleteOpenChange(open: boolean) {
    if (!open) setPendingDelete(null);
  }
  function handleDeleteConfirm() {
    if (!pendingDelete) return;
    deleteFence.mutate(pendingDelete.id, {
      onSuccess: () => {
        toast.success(`Removed geofence "${pendingDelete.name}"`);
        setPendingDelete(null);
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  // hr:attendance:view gates this read and the route has no server guard: a denied
  // caller read "No geofences configured" (FE-47).
  const pageState = usePageState({ permission: "hr:attendance:view", isLoading, isError, error });

  if (pageState.kind !== "ready" && pageState.kind !== "empty") {
    return (
      <PageState
        resolution={pageState}
        className="flex-1"
        onRetry={handleRetry}
        loading={
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-2xl" />
            ))}
          </div>
        }
      >
        {null}
      </PageState>
    );
  }

  if (!fences?.length) {
    return (
      <EmptyState
        illustrationPreset="settings"
        title="No geofences configured"
        description="Add your office locations to enable attendance boundary validation"
        className={CONTENT_FILL_PANEL}
      />
    );
  }

  return (
    <>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {fences.map((fence, idx) => (
        <motion.div
          key={fence.id}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: "easeOut", delay: idx * 0.05 }}
          className="bg-card rounded-xl border border-border shadow-sm p-4 flex flex-col gap-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <TruncatedText text={fence.name} className="text-sm font-semibold text-foreground" />
              <Badge variant="secondary" className="text-dense mt-1">{fence.radiusMeters}m radius</Badge>
            </div>
            {canManage && (
              <div className="flex items-center gap-1 shrink-0">
                <TooltipIconButton
                  label={`Edit ${fence.name}`}
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(fence)}
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </TooltipIconButton>
                <TooltipIconButton
                  label={`Delete ${fence.name}`}
                  icon={Trash2Icon}
                  iconSize={14}
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setPendingDelete(fence)}
                  disabled={deleteFence.isPending}
                />
              </div>
            )}
          </div>
          <div className="space-y-1 text-xs text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>Latitude</span>
              <span className="font-mono font-medium text-foreground">{fence.lat}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Longitude</span>
              <span className="font-mono font-medium text-foreground">{fence.lng}</span>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
    <ConfirmDialog
      open={pendingDelete !== null}
      onOpenChange={handleDeleteOpenChange}
      title="Remove this geofence?"
      description={pendingDelete ? `Check-ins are no longer validated against "${pendingDelete.name}".` : ""}
      confirmLabel="Remove"
      destructive
      isPending={deleteFence.isPending}
      keepOpenOnConfirm
      onConfirm={handleDeleteConfirm}
    />
    </>
  );
}
