"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetBody,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { LoadingButton } from "@/components/ui/loading-button";
import { Lock } from "lucide-react";
import { useCan } from "@/hooks/api/access";
import {
  useAccommodation,
  useAccommodationTasks,
  useApproveAccommodation,
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
  in_progress: "bg-status-info-surface text-status-info-ink",
  completed: "bg-status-success-surface text-status-success-ink",
};

export function AccommodationDetailSheet({ id, open, onOpenChange }: Props) {
  const canManage = useCan("hr:accommodations:manage");
  const canSensitive = useCan("hr:sensitive:view");
  const [approvingNote, setApprovingNote] = useState("");

  const { data: request, isLoading } = useAccommodation(id);
  const { data: tasks } = useAccommodationTasks(id);
  const approve = useApproveAccommodation(id);

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
    approve.mutate({ note: approvingNote || undefined }, {
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <SheetHeader className="shrink-0 border-b border-border px-6 py-4 text-left">
          <SheetTitle className="flex items-center gap-2">
            <span className="capitalize">{request.type.replace(/_/g, " ")}</span>
            <Badge variant="outline" className="ml-auto text-xs capitalize">
              {request.status.replace(/_/g, " ")}
            </Badge>
          </SheetTitle>
        </SheetHeader>

        <SheetBody className="space-y-4 px-6 py-5">
          <div>
            <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Description</p>
            <p className="text-sm text-foreground">{request.description}</p>
          </div>

          {canSensitive && request.confidentialMedicalNote && (
            <div className="rounded-lg border border-status-warning-rule bg-status-warning-surface p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Lock className="h-3.5 w-3.5 text-status-warning-ink" />
                <span className="text-xs font-medium text-status-warning-ink">Confidential Medical Note</span>
              </div>
              <p className="text-sm text-status-warning-ink">{request.confidentialMedicalNote}</p>
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
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
