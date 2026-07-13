"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { LoadingButton } from "@/components/ui/loading-button";
import { Lock, Plus, CheckCircle } from "lucide-react";
import { useCan } from "@/hooks/api/access";
import {
  useAccommodation,
  useAccommodationTasks,
  useApproveAccommodation,
  useUpdateAccommodationTask,
  type AccommodationTaskStatus,
} from "@/hooks/api/hr/enterprise-ops-accommodations";
import { format } from "date-fns";

interface Props {
  id: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TASK_STATUS_COLORS: Record<AccommodationTaskStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  in_progress: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300",
  completed: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300",
};

export function AccommodationDetailSheet({ id, open, onOpenChange }: Props) {
  const canManage = useCan("hr:accommodations:manage");
  const canSensitive = useCan("hr:sensitive:view");
  const [approvingNote, setApprovingNote] = useState("");

  const { data: request, isLoading } = useAccommodation(id);
  const { data: tasks } = useAccommodationTasks(id);
  const approve = useApproveAccommodation(id);
  const updateTask = useUpdateAccommodationTask(id, "");

  if (isLoading || !request) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg">
          <div className="animate-pulse space-y-3 mt-8">
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-4 bg-muted rounded w-3/4" />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  function handleApprove() {
    approve.mutate({ note: approvingNote || undefined });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <span className="capitalize">{request.type.replace(/_/g, " ")}</span>
            <Badge variant="outline" className="text-xs ml-auto capitalize">
              {request.status.replace(/_/g, " ")}
            </Badge>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Description</p>
            <p className="text-sm text-foreground">{request.description}</p>
          </div>

          {canSensitive && request.confidentialMedicalNote && (
            <div className="rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Lock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                <span className="text-xs font-medium text-amber-700 dark:text-amber-300">Confidential Medical Note</span>
              </div>
              <p className="text-sm text-amber-800 dark:text-amber-300">{request.confidentialMedicalNote}</p>
            </div>
          )}

          {!canSensitive && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="h-3 w-3" />
              Confidential medical note hidden
            </div>
          )}

          {request.note && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Reviewer Note</p>
              <p className="text-sm text-foreground">{request.note}</p>
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            Submitted {format(new Date(request.createdAt), "MMM d, yyyy")}
          </div>

          {canManage && request.status === "requested" && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-sm font-medium">Approve Request</p>
                <textarea
                  className="w-full text-sm rounded-md border border-border bg-background px-3 py-2 resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  rows={2}
                  placeholder="Approval note (optional)"
                  value={approvingNote}
                  onChange={(e) => setApprovingNote(e.target.value)}
                />
                <LoadingButton
                  onClick={handleApprove}
                  isPending={approve.isPending}
                  loadingText="Approving…"
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  Approve
                </LoadingButton>
              </div>
            </>
          )}

          {tasks && tasks.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium mb-2">Tasks</p>
                <div className="space-y-2">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2"
                    >
                      <span className="text-sm text-foreground">{task.title}</span>
                      <Badge
                        variant="secondary"
                        className={`text-xs ${TASK_STATUS_COLORS[task.status]}`}
                      >
                        {task.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
