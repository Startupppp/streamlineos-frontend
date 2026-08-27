"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { AiCitationChips, type Citation } from "@/components/ai/ai-citation-chips";
import { ThumbsUpIcon, ThumbsDownIcon } from "@animateicons/react/lucide";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { useKbResearchBrief, useRateResearchBrief } from "@/hooks/api/kb/research-briefs";
import type { KbResearchBriefCitation, KbResearchBriefStatus } from "@/types/kb";

interface KbResearchBriefDetailProps {
  briefId: number;
}

const STATUS_LABELS: Record<KbResearchBriefStatus, string> = {
  queued: "Queued",
  running: "Running",
  completed: "Completed",
  failed: "Failed",
};

const STATUS_CLASSES: Record<KbResearchBriefStatus, string> = {
  queued: "bg-muted text-muted-foreground border-border",
  running: "bg-primary/10 text-primary border-primary/20",
  completed: "bg-status-success-surface text-status-success-ink border-status-success-rule",
  failed: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
};

function buildBriefCitations(citations: KbResearchBriefCitation[]): Citation[] {
  return citations.map((c) => ({
    id: `${c.kind}-${c.id}`,
    title: c.title,
    href: c.href ?? undefined,
    freshness: c.updatedAt ?? undefined,
  }));
}

function BriefFeedback({ briefId, currentRating }: { briefId: number; currentRating: "helpful" | "not_helpful" | null }) {
  const rateMutation = useRateResearchBrief();

  function handleRateHelpful() {
    rateMutation.mutate(
      { briefId, rating: "helpful" },
      { onError: (e) => toast.error(getErrorMessage(e)) },
    );
  }

  function handleRateNotHelpful() {
    rateMutation.mutate(
      { briefId, rating: "not_helpful" },
      { onError: (e) => toast.error(getErrorMessage(e)) },
    );
  }

  if (currentRating) {
    return (
      <p className="text-xs text-muted-foreground">
        You rated this brief as{" "}
        <span className="font-medium">{currentRating === "helpful" ? "helpful" : "not helpful"}</span>.
      </p>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Was this brief helpful?</span>
      <AnimatedIconButton
        icon={ThumbsUpIcon}
        iconSize={12}
        variant="outline"
        size="sm"
        className="h-7 gap-1.5 text-xs"
        onClick={handleRateHelpful}
        disabled={rateMutation.isPending}
      >
        Yes
      </AnimatedIconButton>
      <AnimatedIconButton
        icon={ThumbsDownIcon}
        iconSize={12}
        variant="outline"
        size="sm"
        className="h-7 gap-1.5 text-xs"
        onClick={handleRateNotHelpful}
        disabled={rateMutation.isPending}
      >
        No
      </AnimatedIconButton>
    </div>
  );
}

export function KbResearchBriefDetail({ briefId }: KbResearchBriefDetailProps) {
  const { data: brief, isLoading, error, refetch } = useKbResearchBrief(briefId);
  const [showFullReport, setShowFullReport] = useState(false);

  const citations = useMemo(() => {
    if (!brief?.citations) return [];
    return buildBriefCitations(brief.citations);
  }, [brief]);

  const formattedDate = useMemo(() => {
    if (!brief) return "—";
    try {
      return format(new Date(brief.createdAt), "MMM d, yyyy 'at' h:mm a");
    } catch {
      return "—";
    }
  }, [brief]);

  const reportPreview = useMemo(() => {
    if (!brief?.report) return null;
    if (showFullReport || brief.report.length <= 600) return brief.report;
    return `${brief.report.slice(0, 600)}…`;
  }, [brief, showFullReport]);

  function handleRetry() {
    void refetch();
  }

  function handleToggleReport() {
    setShowFullReport((prev) => !prev);
  }

  if (isLoading) return <LoadingState variant="form" rows={6} />;
  if (error) {
    return <ErrorState description={getErrorMessage(error)} onRetry={handleRetry} />;
  }
  if (!brief) return null;

  const isInProgress = brief.status === "queued" || brief.status === "running";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="p-4 pb-0">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold leading-snug">{brief.topic}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{formattedDate}</p>
            </div>
            <Badge
              variant="outline"
              className={cn("text-micro h-5 shrink-0", STATUS_CLASSES[brief.status])}
            >
              {isInProgress && <Loader2 className="h-2.5 w-2.5 mr-1 animate-spin" />}
              {STATUS_LABELS[brief.status]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {isInProgress && (
            <div className="flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/10 px-3 py-2.5">
              <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
              <p className="text-label text-muted-foreground">
                {brief.status === "queued" ? "Your brief is queued and will start shortly…" : "Generating your research brief…"}
              </p>
            </div>
          )}

          {brief.status === "failed" && brief.errorMessage && (
            <div className="rounded-lg bg-destructive/5 border border-destructive/20 px-3 py-2.5">
              <p className="text-label text-destructive">{brief.errorMessage}</p>
            </div>
          )}

          {brief.sourceCount > 0 && (
            <p className="text-xs text-muted-foreground">
              {brief.sourceCount} source{brief.sourceCount !== 1 ? "s" : ""} consulted
            </p>
          )}

          {citations.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-dense font-medium uppercase tracking-wide text-muted-foreground">Sources</p>
              <AiCitationChips citations={citations} />
            </div>
          )}
        </CardContent>
      </Card>

      {reportPreview && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <p className="text-dense font-medium uppercase tracking-wide text-muted-foreground">Report</p>
            <p className="text-label leading-relaxed whitespace-pre-wrap">{reportPreview}</p>
            {brief.report && brief.report.length > 600 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={handleToggleReport}>
                {showFullReport ? "Show less" : "Show full report"}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {brief.status === "completed" && (
        <Card>
          <CardContent className="p-4">
            <BriefFeedback briefId={brief.id} currentRating={brief.rating} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
