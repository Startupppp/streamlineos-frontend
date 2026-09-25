"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingButton } from "@/components/ui/loading-button";
import { Separator } from "@/components/ui/separator";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { Radio, CheckCircle, AlertCircle, Clock, ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import {
  useEmergencyEvent,
  useEmergencyEventStatus,
  useBroadcastEmergency,
  useRespondToEmergency,
  useUpdateEmergencyEvent,
} from "@/hooks/api/hr/enterprise-ops-emergency";
import { format } from "date-fns";

interface Props {
  eventId: string;
  onBack: () => void;
}

export function EmergencyEventDetail({ eventId, onBack }: Props) {
  const canManage = useCan("hr:emergency:manage");
  const [respondStatus, setRespondStatus] = useState<"safe" | "need_help" | null>(null);
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [confirmResolve, setConfirmResolve] = useState(false);

  const { data: event, isLoading, isError, error, refetch } = useEmergencyEvent(eventId);
  const { data: status } = useEmergencyEventStatus(eventId);
  const broadcast = useBroadcastEmergency(eventId);
  const respond = useRespondToEmergency(eventId);
  const update = useUpdateEmergencyEvent(eventId);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (isLoading) {
    return (
      <div className="space-y-3 p-8">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }

  if (isError || !event) {
    return (
      <PageWrapper
        title="Emergency event"
        leading={
          <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back
          </Button>
        }
      >
        {isError ? (
          <ErrorState
            className="flex-1"
            title="Couldn't load this emergency event"
            description={getErrorMessage(error)}
            onRetry={handleRetry}
          />
        ) : (
          <EmptyState
            illustrationPreset="alert"
            title="Event not found"
            description="This emergency event no longer exists."
          />
        )}
      </PageWrapper>
    );
  }

  const agg = status?.aggregate ?? {};
  const safe = (agg["safe"] as number) ?? 0;
  const needHelp = (agg["need_help"] as number) ?? 0;
  const noResponse = (agg["no_response"] as number) ?? 0;
  const total = status?.total ?? 0;

  function handleBroadcast() {
    broadcast.mutate({ message: broadcastMsg || undefined });
  }

  function handleRespond(s: "safe" | "need_help") {
    setRespondStatus(s);
    respond.mutate({ status: s });
  }

  function handleRespondSafe() {
    handleRespond("safe");
  }

  function handleRespondNeedHelp() {
    handleRespond("need_help");
  }

  function handleOpenResolve() {
    setConfirmResolve(true);
  }

  function handleResolve() {
    update.mutate({ status: "resolved" }, { onSuccess: () => setConfirmResolve(false) });
  }

  return (
    <PageWrapper
      title={event.name}
      subtitle={`${event.type.replace(/_/g, " ")} · ${event.status}`}
      leading={
        <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back
        </Button>
      }
      actions={
        canManage && event.status === "active" ? (
          <Button onClick={handleOpenResolve} variant="outline" size="sm">
            Mark Resolved
          </Button>
        ) : null
      }
    >
      <div className="space-y-6">
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <p className="text-sm font-medium text-foreground">Message</p>
          <p className="text-sm text-muted-foreground">{event.message}</p>
          <div className="text-xs text-muted-foreground">
            Declared {format(new Date(event.createdAt), "MMM d, yyyy HH:mm")}
            {event.resolvedAt && ` · Resolved ${format(new Date(event.resolvedAt), "MMM d, yyyy HH:mm")}`}
          </div>
        </div>

        {total > 0 && (
          <StatCardGrid cols={3}>
            <StatCard label="Safe" value={safe} icon={CheckCircle} tone="emerald" />
            <StatCard label="Need Help" value={needHelp} icon={AlertCircle} tone="red" />
            <StatCard label="No Response" value={noResponse} icon={Clock} tone="default" />
          </StatCardGrid>
        )}

        {event.status === "active" && (
          <>
            <Separator />
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <p className="text-sm font-medium">Your Safety Status</p>
              <div className="flex gap-3">
                <LoadingButton
                  onClick={handleRespondSafe}
                  isPending={respond.isPending && respondStatus === "safe"}
                  disabled={respond.isPending}
                  className="flex-1 bg-status-success-fill hover:bg-status-success-fill-hover text-white"
                >
                  <CheckCircle className="h-4 w-4 mr-1.5" />
                  I&apos;m Safe
                </LoadingButton>
                <LoadingButton
                  onClick={handleRespondNeedHelp}
                  isPending={respond.isPending && respondStatus === "need_help"}
                  disabled={respond.isPending}
                  variant="destructive"
                  className="flex-1"
                >
                  <AlertCircle className="h-4 w-4 mr-1.5" />
                  Need Help
                </LoadingButton>
              </div>
            </div>

            {canManage && (
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-1.5">
                  <Radio className="h-4 w-4 text-primary" />
                  Broadcast Check-in
                </p>
                <Textarea
                  aria-label="Check-in message"
                  rows={2}
                  placeholder="Optional override message…"
                  value={broadcastMsg}
                  onChange={(e) => setBroadcastMsg(e.target.value)}
                />
                <LoadingButton
                  onClick={handleBroadcast}
                  isPending={broadcast.isPending}
                  loadingText="Broadcasting…"
                >
                  Send Check-in
                </LoadingButton>
              </div>
            )}
          </>
        )}
      </div>
      <ConfirmDialog
        open={confirmResolve}
        onOpenChange={setConfirmResolve}
        title="Mark this event resolved?"
        description="Employees can no longer report their safety status once the event is resolved."
        confirmLabel="Mark resolved"
        isPending={update.isPending}
        keepOpenOnConfirm
        onConfirm={handleResolve}
      />
    </PageWrapper>
  );
}
