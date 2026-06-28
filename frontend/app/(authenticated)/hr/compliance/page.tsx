"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import { useCallback } from "react";
import {
  usePolicyAcknowledgments,
  useAcknowledgePolicy,
  type PolicyAcknowledgment,
} from "@/lib/api/hooks/hr";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { FileCheck, Clock, XCircle, CheckCircle2, FileText, ShieldCheck, AlertCircle } from "lucide-react";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

type AckStatus = "ACKNOWLEDGED" | "DECLINED";

function getStatusConfig(status: string | null) {
  if (status === "ACKNOWLEDGED") {
    return {
      badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
      accent: "border-l-emerald-500",
      icon: <CheckCircle2 className="h-2.5 w-2.5" />,
    };
  }
  if (status === "DECLINED") {
    return {
      badge: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200 dark:border-rose-800",
      accent: "border-l-rose-500",
      icon: <XCircle className="h-2.5 w-2.5" />,
    };
  }
  return {
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    accent: "border-l-amber-500",
    icon: <Clock className="h-2.5 w-2.5" />,
  };
}

interface PendingAckCardProps {
  ack: PolicyAcknowledgment;
  onAcknowledge: (id: number, status: AckStatus) => void;
  isPending: boolean;
}

function PendingAckCard({ ack, onAcknowledge, isPending }: PendingAckCardProps) {
  const handleAcknowledge = useCallback(() => {
    onAcknowledge(ack.id, "ACKNOWLEDGED");
  }, [ack.id, onAcknowledge]);

  const handleDecline = useCallback(() => {
    onAcknowledge(ack.id, "DECLINED");
  }, [ack.id, onAcknowledge]);

  return (
    <Card className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden border-l-4 border-l-amber-500">
      <CardContent className="p-4 flex items-center gap-3">
        <div className="h-7 w-7 rounded-lg bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center shrink-0">
          <FileText className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {ack.document?.name ?? "Document"}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {ack.document?.type && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300 border-slate-200 dark:border-slate-800 mr-1.5">
                {ack.document.type}
              </span>
            )}
            Sent{" "}
            {ack.createdAt
              ? formatDistanceToNow(new Date(ack.createdAt), { addSuffix: true })
              : ""}
          </p>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <Button
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={handleAcknowledge}
            disabled={isPending}
          >
            <CheckCircle2 className="h-3 w-3" />
            Acknowledge
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 text-xs"
            onClick={handleDecline}
            disabled={isPending}
          >
            <XCircle className="h-3 w-3" />
            Decline
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CompliancePage() {
  const { data: session } = useSession();
  const { data: acks, isLoading, isError, refetch } = usePolicyAcknowledgments();
  const acknowledgePolicy = useAcknowledgePolicy();
  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  const handleAcknowledge = useCallback(
    (id: number, status: AckStatus) => {
      acknowledgePolicy.mutate(
        { acknowledgmentId: id, status },
        {
          onSuccess: () =>
            toast.success(status === "ACKNOWLEDGED" ? "Policy acknowledged" : "Policy declined"),
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [acknowledgePolicy],
  );

  if (isLoading) {
    return (
      <PageWrapper title="Compliance" subtitle="Policy acknowledgments and document tracking">
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper title="Compliance" subtitle="Policy acknowledgments and document tracking">
        <EmptyState
          illustration={<AlertCircle className="h-8 w-8 text-destructive" />}
          title="Failed to load policies"
          description="Something went wrong. Please try again."
          action={{ label: "Retry", onClick: refetch }}
        />
      </PageWrapper>
    );
  }

  const all = acks ?? [];
  const pending = all.filter(
    (a) => a.status === "PENDING" && a.userId === session?.user?.id,
  );
  const acknowledged = all.filter((a) => a.status === "ACKNOWLEDGED");
  const compliancePct = all.length > 0 ? Math.round((acknowledged.length / all.length) * 100) : 0;

  return (
    <PageWrapper
      title="Compliance"
      subtitle="Policy acknowledgments and document tracking"
      badge={pending.length > 0 ? `${pending.length} pending` : undefined}
    >
      <div className="space-y-5">
        {all.length > 0 && (
          <Card className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">Overall Compliance</p>
                </div>
                <span className="text-3xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                  {compliancePct}%
                </span>
              </div>
              <Progress value={compliancePct} className="h-2 bg-muted" />
              <div className="flex gap-4 mt-2">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {acknowledged.length} acknowledged
                </p>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {all.filter((a) => a.status === "DECLINED").length} declined
                </p>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {all.filter((a) => a.status === "PENDING").length} pending
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {pending.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center">
                <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              </div>
              <p className="text-sm font-semibold text-foreground">
                Requires Your Action
              </p>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800">
                {pending.length}
              </span>
            </div>
            {pending.map((ack: PolicyAcknowledgment) => (
              <PendingAckCard
                key={ack.id}
                ack={ack}
                onAcknowledge={handleAcknowledge}
                isPending={acknowledgePolicy.isPending}
              />
            ))}
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-slate-100 dark:bg-slate-900/40 flex items-center justify-center">
              <FileCheck className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-foreground">All Acknowledgments</p>
          </div>

          {all.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
              <EmptyState
                illustration={<FileCheck className="h-8 w-8 text-muted-foreground" />}
                title="No policy acknowledgments yet"
                description="Policy documents assigned to employees will appear here."
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              {all.map((ack: PolicyAcknowledgment) => {
                const cfg = getStatusConfig(ack.status);
                return (
                  <Card
                    key={ack.id}
                    className={cn(
                      "rounded-2xl border border-border bg-card shadow-sm overflow-hidden border-l-4",
                      cfg.accent,
                    )}
                  >
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="h-6 w-6 rounded-md bg-muted flex items-center justify-center shrink-0">
                        <FileText className="h-3 w-3 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">
                          {ack.document?.name ?? "Document"}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {ack.user?.name ?? ack.user?.email}
                          {ack.document?.type && (
                            <span className="ml-1.5 text-muted-foreground/70">· {ack.document.type}</span>
                          )}
                        </p>
                      </div>
                      <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0", cfg.badge)}>
                        {cfg.icon}
                        {ack.status ?? "PENDING"}
                      </span>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
