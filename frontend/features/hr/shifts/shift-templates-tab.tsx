"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Moon, Edit2 } from "lucide-react";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Trash2Icon } from "@animateicons/react/lucide";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/api-client";
import { useHrShifts, useDeleteShift, type ShiftTemplate } from "@/hooks/api/hr/shifts";
import { TruncatedText } from "@/components/ui/truncated-text";

interface Props {
  canManage: boolean;
  onEdit: (shift: ShiftTemplate) => void;
}

export function ShiftTemplatesTab({ canManage, onEdit }: Props) {
  const { data: shifts, isLoading } = useHrShifts();
  const deleteShift = useDeleteShift();
  const [pendingDelete, setPendingDelete] = useState<ShiftTemplate | null>(null);

  function handleConfirmDelete() {
    if (!pendingDelete) return;
    deleteShift.mutate(pendingDelete.id, {
      onSuccess: () => {
        toast.success("Shift deleted");
        setPendingDelete(null);
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (!shifts?.length) {
    return (
      <EmptyState
        illustrationPreset="calendar"
        title="No shift templates yet"
        description="Create your first shift template using the button above"
        className={CONTENT_FILL_PANEL}
      />
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {shifts.map((shift, idx) => (
          <motion.div
            key={shift.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: "easeOut", delay: idx * 0.05 }}
            className="bg-card rounded-xl border border-border shadow-sm p-4 flex flex-col gap-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <TruncatedText text={shift.name} className="text-sm font-semibold text-foreground" />
                <div className="flex items-center gap-1.5 mt-1">
                  <Badge variant="secondary" className="text-[11px]">{shift.type}</Badge>
                  {shift.isNightShift && (
                    <Badge variant="outline" className="text-[11px] gap-1">
                      <Moon className="h-3 w-3" />Night
                    </Badge>
                  )}
                </div>
              </div>
              {canManage && (
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-7"
                    onClick={() => onEdit(shift)}
                    aria-label={`Edit ${shift.name}`}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <AnimatedIconButton
                    icon={Trash2Icon}
                    iconSize={14}
                    variant="ghost"
                    size="icon"
                    className="w-7 text-destructive hover:text-destructive"
                    onClick={() => setPendingDelete(shift)}
                    disabled={deleteShift.isPending}
                    aria-label={`Delete ${shift.name}`}
                  />
                </div>
              )}
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Hours</span>
                <span className="font-medium text-foreground">{shift.startTime} – {shift.endTime}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Break</span>
                <span className="font-medium text-foreground">{shift.breakMinutes} min</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Grace period</span>
                <span className="font-medium text-foreground">{shift.gracePeriodMinutes} min</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <ConfirmDialog
        open={pendingDelete != null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title="Delete shift template?"
        description={
          pendingDelete
            ? `Delete “${pendingDelete.name}”? This cannot be undone and may affect related assignments.`
            : "Delete this shift template?"
        }
        confirmLabel="Delete"
        destructive
        isPending={deleteShift.isPending}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
