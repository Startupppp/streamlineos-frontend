"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyActivityIllustration } from "@/components/illustrations";
import { CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import { format } from "date-fns";
import { useSupportAutomationRuns } from "@/hooks/api/support-automations";
import type { AutomationRunStatus } from "@/hooks/api/automations";
import { TruncatedText } from "@/components/ui/truncated-text";

interface SupportAutomationRunsDialogProps {
  automationId: number;
  ruleName: string;
  onClose: () => void;
}

function StatusBadge({ status }: { status: AutomationRunStatus }) {
  if (status === "success")
    return (
      <Badge variant="default" className="gap-1 text-dense">
        <CheckCircle2 className="h-3 w-3" /> Success
      </Badge>
    );
  if (status === "skipped")
    return (
      <Badge variant="secondary" className="gap-1 text-dense">
        <MinusCircle className="h-3 w-3" /> Skipped
      </Badge>
    );
  return (
    <Badge variant="destructive" className="gap-1 text-dense">
      <XCircle className="h-3 w-3" /> Failed
    </Badge>
  );
}

export function SupportAutomationRunsDialog({
  automationId,
  ruleName,
  onClose,
}: SupportAutomationRunsDialogProps) {
  const { data: runs, isLoading, isError, refetch } = useSupportAutomationRuns(automationId);

  function handleRetry() {
    void refetch();
  }

  function handleOpenChange(open: boolean) {
    if (!open) onClose();
  }

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Recent runs</DialogTitle>
          <DialogDescription>Last 50 executions of &ldquo;{ruleName}&rdquo;.</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <LoadingState variant="list" rows={8} />
        ) : isError ? (
          <ErrorState
            compact
            title="Couldn't load runs"
            description="Something went wrong fetching the run history."
            onRetry={handleRetry}
          />
        ) : !runs || runs.length === 0 ? (
          <EmptyState
            compact
            illustration={<EmptyActivityIllustration />}
            title="No runs yet"
            description="This automation hasn't executed yet."
          />
        ) : (
          <ScrollArea className="max-h-[60dvh]">
            <div className="space-y-2 pr-3">
              {runs.map((run) => (
                <div key={run.id} className="rounded-lg border border-border/60 p-3 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <StatusBadge status={run.status} />
                    <span className="text-dense text-muted-foreground">
                      {run.createdAt ? format(new Date(run.createdAt), "MMM d, HH:mm") : ""}
                    </span>
                  </div>
                  <TruncatedText
                    text={`Trigger: ${run.triggerEvent}`}
                    className="text-xs text-muted-foreground"
                  />
                  {run.error && (
                    <p className="text-xs text-destructive wrap-break-word">{run.error}</p>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
