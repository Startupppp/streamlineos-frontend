"use client";

import { motion } from "framer-motion";
import { Clock, Moon, Edit2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/api-client";
import { useHrShifts, useDeleteShift } from "@/hooks/api/hr/shifts";

interface Props {
  canManage: boolean;
}

export function ShiftTemplatesTab({ canManage }: Props) {
  const { data: shifts, isLoading } = useHrShifts();
  const deleteShift = useDeleteShift();

  function handleDelete(id: number) {
    deleteShift.mutate(id, {
      onSuccess: () => toast.success("Shift deleted"),
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
      <div className="flex flex-col items-center justify-center flex-1 h-64 gap-3 text-center">
        <Clock className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm font-medium text-muted-foreground">No shift templates yet</p>
        <p className="text-xs text-muted-foreground/70">Create your first shift template using the button above</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {shifts.map((shift, idx) => (
        <motion.div
          key={shift.id}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: "easeOut", delay: idx * 0.05 }}
          className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/60 p-4 flex flex-col gap-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{shift.name}</p>
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
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(shift.id)}
                  disabled={deleteShift.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
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
  );
}
