"use client";

import { useState, useCallback } from "react";
import { format } from "date-fns";
import {
  FileText,
  Send,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  FileSignature,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RecruitmentEmptyState } from "@/features/hr/recruitment/components/recruitment-empty-state";
import { EmptyDocumentsIllustration } from "@/components/illustrations";

import { useRolloutDocuments, type RolloutDocumentRecord } from "@/hooks/api/hr/recruitment";
import { RolloutDocumentsDialog } from "@/components/hr/recruitment/rollout-documents-dialog";
import { cn } from "@/lib/utils";

type DocStatus = "GENERATED" | "SENT" | "VIEWED" | "SIGNED" | "DECLINED";

const STATUS_CONFIG: Record<
  DocStatus,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badgeClass: string;
    accentClass: string;
  }
> = {
  GENERATED: {
    label: "Generated",
    icon: FileText,
    badgeClass: "bg-muted text-muted-foreground border-border",
    accentClass: "border-l-border",
  },
  SENT: {
    label: "Sent",
    icon: Send,
    badgeClass: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800",
    accentClass: "border-l-blue-500",
  },
  VIEWED: {
    label: "Viewed",
    icon: Eye,
    badgeClass: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800",
    accentClass: "border-l-amber-500",
  },
  SIGNED: {
    label: "Signed",
    icon: CheckCircle2,
    badgeClass: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800",
    accentClass: "border-l-emerald-500",
  },
  DECLINED: {
    label: "Declined",
    icon: XCircle,
    badgeClass: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-800",
    accentClass: "border-l-rose-500",
  },
};

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status as DocStatus] ?? STATUS_CONFIG.GENERATED;
}

function EsignTimeline({ doc }: { doc: RolloutDocumentRecord }) {
  const steps: Array<{
    key: keyof RolloutDocumentRecord;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { key: "sentAt", label: "Sent", icon: Send },
    { key: "viewedAt", label: "Viewed", icon: Eye },
    { key: "signedAt", label: "Signed", icon: CheckCircle2 },
  ];

  if (doc.declinedAt) {
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-rose-600 dark:text-rose-400 mt-2">
        <XCircle className="h-3 w-3" />
        <span>Declined {format(new Date(doc.declinedAt), "PPp")}</span>
      </div>
    );
  }

  const doneCount = steps.filter((s) => doc[s.key] !== null && doc[s.key] !== undefined).length;

  return (
    <div className="flex items-center gap-1 mt-2.5">
      {steps.map((step, idx) => {
        const ts = doc[step.key] as string | null;
        const done = ts !== null && ts !== undefined;
        const Icon = step.icon;
        return (
          <div key={step.key} className="flex items-center gap-1">
            <div
              className={cn(
                "flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border transition-colors duration-200",
                done
                  ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800"
                  : "bg-muted text-muted-foreground border-border"
              )}
              title={ts ? format(new Date(ts), "PPp") : step.label}
            >
              <Icon className="h-3 w-3" />
              <span>{step.label}</span>
            </div>
            {idx < steps.length - 1 && (
              <ChevronRight
                className={cn(
                  "h-3 w-3",
                  doneCount > idx ? "text-emerald-500" : "text-muted-foreground/30"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

interface DocumentsTabProps {
  candidateId: number;
  candidateName: string;
  jobTitle?: string;
  candidateStatus: string | null;
}

export function DocumentsTab({
  candidateId,
  candidateName,
  jobTitle,
  candidateStatus,
}: DocumentsTabProps) {
  const { data: docs, isLoading, refetch } = useRolloutDocuments(candidateId);
  const [rolloutOpen, setRolloutOpen] = useState(false);

  const isSelected =
    candidateStatus === "OFFER" ||
    candidateStatus === "HIRED" ||
    candidateStatus === "SELECTED";

  const handleGenerateOffer = useCallback(() => setRolloutOpen(true), []);

  const handleRolloutOpenChange = useCallback((open: boolean) => {
    setRolloutOpen(open);
    if (!open) void refetch();
  }, [refetch]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  const list = docs ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          {list.length} document{list.length !== 1 ? "s" : ""}
        </p>
        <Button
          size="sm"
          variant={isSelected ? "default" : "outline"}
          className="gap-1.5 text-xs"
          onClick={handleGenerateOffer}
        >
          <FileSignature className="h-3.5 w-3.5" />
          Generate Offer
        </Button>
      </div>

      {!isSelected && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/80 dark:bg-amber-950/20 dark:border-amber-800 p-3 text-xs text-amber-700 dark:text-amber-400">
          <Clock className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>
            Move this candidate to the <strong>Offer</strong> stage to trigger the automatic offer generation prompt.
          </span>
        </div>
      )}

      {list.length === 0 ? (
        <RecruitmentEmptyState
          illustration={<EmptyDocumentsIllustration />}
          title="No documents yet"
          description="Generate and send offer documents to this candidate."
          action={{ label: "Generate Offer", onClick: handleGenerateOffer }}
          compact
        />
      ) : (
        <div className="space-y-3">
          {list.map((doc) => {
            const cfg = getStatusConfig(doc.status);
            const StatusIcon = cfg.icon;
            return (
              <div
                key={doc.id}
                className={cn(
                  "rounded-2xl border border-border bg-card shadow-sm overflow-hidden border-l-4 transition-colors duration-200 hover:border-border/80",
                  cfg.accentClass
                )}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="w-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <span className="text-sm font-semibold text-foreground truncate">{doc.title}</span>
                      </div>
                      {doc.createdAt && (
                        <p className="text-[11px] text-muted-foreground mt-1 ml-9">
                          Created {format(new Date(doc.createdAt), "PPP")}
                        </p>
                      )}
                      <div className="ml-9">
                        <EsignTimeline doc={doc} />
                      </div>
                    </div>
                    <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0", cfg.badgeClass)}>
                      <StatusIcon className="h-3 w-3" />
                      {cfg.label}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <RolloutDocumentsDialog
        open={rolloutOpen}
        onOpenChange={handleRolloutOpenChange}
        candidateId={candidateId}
        candidateName={candidateName}
        jobTitle={jobTitle}
      />
    </div>
  );
}
