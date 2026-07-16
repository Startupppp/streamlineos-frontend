"use client";

import { motion } from "framer-motion";
import { Edit2 } from "lucide-react";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Trash2Icon } from "@animateicons/react/lucide";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/api-client";
import { useGeofences, useDeleteGeofence, type Geofence } from "@/hooks/api/hr/geofencing";

interface Props {
  canManage: boolean;
  onEdit: (fence: Geofence) => void;
}

export function GeofenceList({ canManage, onEdit }: Props) {
  const { data: fences, isLoading } = useGeofences();
  const deleteFence = useDeleteGeofence();

  function handleDelete(id: number) {
    deleteFence.mutate(id, {
      onSuccess: () => toast.success("Geofence removed"),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-2xl" />
        ))}
      </div>
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
              <p className="text-sm font-semibold text-foreground truncate">{fence.name}</p>
              <Badge variant="secondary" className="text-[11px] mt-1">{fence.radiusMeters}m radius</Badge>
            </div>
            {canManage && (
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-7"
                  onClick={() => onEdit(fence)}
                  aria-label={`Edit ${fence.name}`}
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
                <AnimatedIconButton
                  icon={Trash2Icon}
                  iconSize={14}
                  variant="ghost"
                  size="icon"
                  className="w-7 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(fence.id)}
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
  );
}
