"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, ExternalLink, RefreshCw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import DOMPurify from "isomorphic-dompurify";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { LoadingButton } from "@/components/ui/loading-button";
import { getErrorMessage } from "@/lib/get-error-message";
import { isApiError } from "@/lib/api-client";
import { useCan } from "@/hooks/api/access";
import {
  useAnalyzeFeedbucketSubmission,
  useCreateTicketFromFeedbucketAi,
} from "@/hooks/api/feedbucket/use-feedbucket-ai";
import { useConvertFeedbucketToTicket } from "@/hooks/api/feedbucket/use-feedbucket-submissions";
import type { FeedbucketAiAnalysis, FeedbucketAiPriority, FeedbucketAiType } from "@/types/feedbucket";
import { AiUsageChip, type AiUsageMeta } from "@/components/ai/ai-usage-chip";

const AI_UNAVAILABLE_STATUSES = new Set([400, 402, 503]);

const AI_TYPE_LABELS: Record<FeedbucketAiType, string> = {
  bug: "Bug",
  feature: "Feature",
  improvement: "Improvement",
  question: "Question",
  praise: "Praise",
  other: "Other",
};

const AI_TYPE_COLORS: Record<FeedbucketAiType, string> = {
  bug: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
  feature: "bg-status-info-surface text-status-info-ink border-status-info-rule",
  improvement: "bg-status-info-surface text-status-info-ink border-status-info-rule",
  question: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  praise: "bg-status-success-surface text-status-success-ink border-status-success-rule",
  other: "bg-muted text-muted-foreground border-border",
};

const PRIORITY_COLORS: Record<FeedbucketAiPriority, string> = {
  LOW: "bg-muted text-muted-foreground border-border",
  MEDIUM: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  HIGH: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  URGENT: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
};

const TICKET_TYPE_LABELS: Record<string, string> = {
  EPIC: "Epic",
  BUG: "Bug",
  STORY: "Story",
  TASK: "Task",
};

function AiAnalysisSkeleton() {
  return (
    <div className="space-y-3 animate-pulse" aria-label="Analyzing…">
      <div className="flex gap-2">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-12 rounded-full" />
      </div>
      <Skeleton className="h-5 w-3/4 rounded" />
      <Skeleton className="h-20 w-full rounded" />
      <Skeleton className="h-16 w-full rounded" />
    </div>
  );
}

interface StringListProps {
  items: string[];
  label: string;
}

function StringList({ items, label }: StringListProps) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
      <ol className="space-y-1 pl-4 list-decimal">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-foreground leading-relaxed">
            {item}
          </li>
        ))}
      </ol>
    </div>
  );
}

interface AiAnalysisResultProps {
  analysis: FeedbucketAiAnalysis;
}

function AiAnalysisResult({ analysis }: AiAnalysisResultProps) {
  const confidencePct = Math.round(analysis.confidence * 100);
  const sanitizedDescription = DOMPurify.sanitize(analysis.description);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant="outline"
          className={`text-xs font-medium ${AI_TYPE_COLORS[analysis.type]}`}
        >
          {AI_TYPE_LABELS[analysis.type]}
        </Badge>
        <Badge
          variant="outline"
          className={`text-xs font-medium ${PRIORITY_COLORS[analysis.priority]}`}
        >
          {analysis.priority.charAt(0) + analysis.priority.slice(1).toLowerCase()}
        </Badge>
        <Badge variant="outline" className="text-xs font-medium bg-primary/10 text-foreground border-primary/30">
          {TICKET_TYPE_LABELS[analysis.suggestedTicketType] ?? analysis.suggestedTicketType}
        </Badge>
        <span className="text-xs text-muted-foreground ml-auto">{confidencePct}% confidence</span>
      </div>

      <div className="space-y-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Suggested Title</p>
        <p className="text-sm font-medium text-foreground">{analysis.title}</p>
      </div>

      {analysis.summary && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Summary</p>
          <p className="text-sm text-foreground leading-relaxed">{analysis.summary}</p>
        </div>
      )}

      {sanitizedDescription && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</p>
          <div
            className="prose prose-slate max-w-none prose-sm prose-p:my-1 prose-headings:font-semibold prose-a:text-primary prose-code:bg-muted prose-code:px-1 prose-code:rounded prose-code:text-xs rounded-lg border border-border bg-muted/30 p-3 text-sm"
            dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
          />
        </div>
      )}

      <StringList items={analysis.reproductionSteps} label="Reproduction Steps" />
      <StringList items={analysis.suggestions} label="Suggestions" />
      <StringList items={analysis.acceptanceCriteria} label="Acceptance Criteria" />

      <p className="text-xs text-muted-foreground">
        Analyzed by {analysis.model} ·{" "}
        {new Date(analysis.processedAt).toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        })}
      </p>
    </div>
  );
}

interface FeedbucketAiPanelProps {
  submissionId: number;
  hasScreenshot: boolean;
  existingAnalysis: FeedbucketAiAnalysis | null;
  linkedTicketId: number | null;
  linkedTicketKey: string | null;
  projectId: number | null | undefined;
  onTicketCreated: (ticketId: number) => void;
}

export function FeedbucketAiPanel({
  submissionId,
  hasScreenshot,
  existingAnalysis,
  linkedTicketId,
  linkedTicketKey,
  projectId,
  onTicketCreated,
}: FeedbucketAiPanelProps) {
  const canAi = useCan("feedbucket:submissions:ai");
  const canManage = useCan("feedbucket:submissions:manage");

  const analyzeMutation = useAnalyzeFeedbucketSubmission();
  const createAiTicketMutation = useCreateTicketFromFeedbucketAi();
  const convertBasicMutation = useConvertFeedbucketToTicket();

  const [localAnalysis, setLocalAnalysis] = useState<FeedbucketAiAnalysis | null>(existingAnalysis);
  const [localTicketId, setLocalTicketId] = useState<number | null>(linkedTicketId);
  const [localTicketKey, setLocalTicketKey] = useState<string | null>(linkedTicketKey);
  const [aiFallbackReason, setAiFallbackReason] = useState<string | null>(null);
  const [lastAnalysisUsage, setLastAnalysisUsage] = useState<AiUsageMeta | null | undefined>(null);

  const analysis = localAnalysis ?? existingAnalysis;
  const ticketId = localTicketId ?? linkedTicketId;
  const ticketKey = localTicketKey ?? linkedTicketKey;
  const isAnalyzing = analyzeMutation.isPending;
  const isCreatingAiTicket = createAiTicketMutation.isPending;
  const isCreatingBasicTicket = convertBasicMutation.isPending;

  async function handleAnalyze(force = false) {
    try {
      const result = await analyzeMutation.mutateAsync({ submissionId, force });
      setLocalAnalysis(result);
      setLastAnalysisUsage(result.aiUsage);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function handleCreateAiTicket() {
    setAiFallbackReason(null);
    try {
      const result = await createAiTicketMutation.mutateAsync(submissionId);
      setLocalTicketId(result.ticketId);
      if ("ticketKey" in result && typeof result.ticketKey === "string") {
        setLocalTicketKey(result.ticketKey);
      }
      onTicketCreated(result.ticketId);
      toast.success("AI-enriched ticket created");
    } catch (error) {
      if (isApiError(error) && AI_UNAVAILABLE_STATUSES.has(error.status ?? 0)) {
        const reason = getErrorMessage(error);
        setAiFallbackReason(reason);
        await handleCreateBasicTicket(true);
      } else {
        toast.error(getErrorMessage(error));
      }
    }
  }

  async function handleCreateBasicTicket(isFallback = false) {
    try {
      const result = await convertBasicMutation.mutateAsync(submissionId);
      setLocalTicketId(result.ticketId);
      onTicketCreated(result.ticketId);
      toast.success(isFallback ? "Basic ticket created (AI unavailable)" : "Ticket created");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  function handleAnalyzeClick() {
    void handleAnalyze(false);
  }

  function handleReAnalyzeClick() {
    void handleAnalyze(true);
  }

  function handleCreateAiTicketClick() {
    void handleCreateAiTicket();
  }

  function handleCreateBasicTicketClick() {
    void handleCreateBasicTicket(false);
  }

  if (canAi) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden />
            <p className="text-sm font-semibold text-foreground">AI Triage</p>
          </div>
          <div className="flex items-center gap-2">
            {analysis && (
              <LoadingButton
                size="sm"
                variant="ghost"
                isPending={isAnalyzing}
                loadingText="Re-analyzing…"
                onClick={handleReAnalyzeClick}
                aria-label="Re-analyze with AI"
                className="px-2 text-xs gap-1"
              >
                <RefreshCw className="h-3 w-3" aria-hidden />
                Re-analyze
              </LoadingButton>
            )}
            {!analysis && !isAnalyzing && (
              <LoadingButton
                size="sm"
                isPending={isAnalyzing}
                loadingText="Analyzing…"
                onClick={handleAnalyzeClick}
                className="gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                Analyze with AI
              </LoadingButton>
            )}
          </div>
        </div>

        {!hasScreenshot && !analysis && !isAnalyzing && (
          <p className="text-xs text-muted-foreground">
            AI works best with a screenshot; analysis will use the text only.
          </p>
        )}

        {isAnalyzing && !analysis && <AiAnalysisSkeleton />}

        {analysis && (
          <>
            <Separator />
            <AiAnalysisResult analysis={analysis} />
            {lastAnalysisUsage && (
              <AiUsageChip usage={lastAnalysisUsage} className="mt-1" />
            )}
          </>
        )}

        {canManage && !ticketId && (
          <>
            <Separator />
            <div className="space-y-2">
              {aiFallbackReason && (
                <div className="flex items-start gap-2 rounded-lg border border-status-warning-rule bg-status-warning-surface p-2.5 text-xs text-status-warning-ink">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" aria-hidden />
                  <span>AI unavailable — basic ticket created instead. ({aiFallbackReason})</span>
                </div>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                <LoadingButton
                  size="sm"
                  isPending={isCreatingAiTicket || isCreatingBasicTicket}
                  loadingText="Creating with AI…"
                  onClick={handleCreateAiTicketClick}
                  className="gap-1.5"
                >
                  <Sparkles className="h-3.5 w-3.5" aria-hidden />
                  Create ticket with AI
                </LoadingButton>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCreateBasicTicketClick}
                  disabled={isCreatingAiTicket || isCreatingBasicTicket}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Create basic ticket
                </Button>
              </div>
            </div>
          </>
        )}

        {ticketId && (
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="text-xs">
              {ticketKey ? ticketKey : `Ticket #${ticketId}`}
            </Badge>
            {projectId && (
              <Link
                href={`/build/${projectId}/tickets/${ticketId}`}
                className="flex items-center gap-1 text-sm text-primary hover:underline"
              >
                View ticket
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </Link>
            )}
          </div>
        )}
      </div>
    );
  }

  if (!canManage || ticketId) {
    if (!ticketId) return null;
    return (
      <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
        <Badge variant="secondary" className="text-xs">
          {ticketKey ? ticketKey : `Ticket #${ticketId}`}
        </Badge>
        {projectId && (
          <Link
            href={`/build/${projectId}/tickets/${ticketId}`}
            className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 hover:underline"
          >
            View ticket
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <LoadingButton
        size="sm"
        isPending={isCreatingBasicTicket}
        loadingText="Converting…"
        onClick={handleCreateBasicTicketClick}
      >
        Convert to Ticket
      </LoadingButton>
    </div>
  );
}
