"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Separator } from "@/components/ui/separator";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { Radio, CheckCircle, AlertCircle, Clock } from "lucide-react";
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

  const { data: event, isLoading } = useEmergencyEvent(eventId);
  const { data: status } = useEmergencyEventStatus(eventId);
  const broadcast = useBroadcastEmergency(eventId);
  const respond = useRespondToEmergency(eventId);
  const update = useUpdateEmergencyEvent(eventId);

  if (isLoading || !event) {
    return (
      <div className="animate-pulse p-8 space-y-3">
        <div className="h-5 bg-muted rounded w-1/3" />
        <div className="h-4 bg-muted rounded w-2/3" />
      </div>
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
    respond.mutate({ status: s });
    setRespondStatus(s);
  }

  function handleResolve() {
    update.mutate({ status: "resolved" });
  }

  return (
    <PageWrapper
      title={event.name}
      subtitle={`${event.type.replace(/_/g, " ")} · ${event.status}`}
      leading={
        <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
          ← Back
        </Button>
      }
      actions={
        canManage && event.status === "active" ? (
          <LoadingButton
            onClick={handleResolve}
            isPending={update.isPending}
            loadingText="Resolving…"
            variant="outline"
            size="sm"
          >
            Mark Resolved
          </LoadingButton>
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
                <Button
                  onClick={() => handleRespond("safe")}
                  disabled={respond.isPending}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                  variant={respondStatus === "safe" ? "default" : "outline"}
                >
                  <CheckCircle className="h-4 w-4 mr-1.5" />
                  I&apos;m Safe
                </Button>
                <Button
                  onClick={() => handleRespond("need_help")}
                  disabled={respond.isPending}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  variant={respondStatus === "need_help" ? "default" : "outline"}
                >
                  <AlertCircle className="h-4 w-4 mr-1.5" />
                  Need Help
                </Button>
              </div>
            </div>

            {canManage && (
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-1.5">
                  <Radio className="h-4 w-4 text-primary" />
                  Broadcast Check-in
                </p>
                <textarea
                  className="w-full text-sm rounded-md border border-border bg-background px-3 py-2 resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  rows={2}
                  placeholder="Optional override message…"
                  value={broadcastMsg}
                  onChange={(e) => setBroadcastMsg(e.target.value)}
                />
                <LoadingButton
                  onClick={handleBroadcast}
                  isPending={broadcast.isPending}
                  loadingText="Broadcasting…"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  Send Check-in
                </LoadingButton>
              </div>
            )}
          </>
        )}
      </div>
    </PageWrapper>
  );
}
