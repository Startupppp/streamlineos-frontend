"use client";

import { AlertTriangle } from "lucide-react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AiCitationChips, type Citation } from "@/components/ai/ai-citation-chips";
import { AiConfidenceBadge } from "@/components/ai/ai-confidence-badge";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { ThumbsUpIcon, ThumbsDownIcon } from "@animateicons/react/lucide";
import { TruncatedText } from "@/components/ui/truncated-text";
import { ReplyImprovementSection } from "./reply-improvement-section";
import { TranslateDraftSection } from "./translate-draft-section";
import { type AiSuggestion, type AiReplySource } from "@/hooks/api/support/ai";
import { type SupportMacro } from "@/hooks/api/support/macros";

function assertNever(value: never): never {
  throw new Error(`Unhandled AI suggestion case: ${JSON.stringify(value)}`);
}

function sourcesToCitations(sources: AiReplySource[]): Citation[] {
  return sources.map((s) => ({ id: s.articleId, title: s.title, href: s.url }));
}

export function suggestionTypeLabel(type: AiSuggestion["type"]): string {
  switch (type) {
    case "summary": return "Summary";
    case "sentiment": return "Sentiment";
    case "category": return "Category";
    case "priority": return "Priority";
    case "spam": return "Spam warning";
    case "reply": return "Suggested reply";
    case "macro": return "Suggested macro";
    case "kb_article": return "Related KB articles";
    case "duplicate": return "Possible duplicate";
    case "handoff_summary": return "Handoff summary";
    case "root_cause_cluster": return "Root cause cluster";
    default: return assertNever(type);
  }
}

export function acceptLabel(suggestion: AiSuggestion): string {
  switch (suggestion.type) {
    case "priority": return `Apply priority: ${suggestion.payload.priority}`;
    case "category": return `Apply category: ${suggestion.payload.category}`;
    case "sentiment": return "Accept sentiment";
    case "summary": return "Accept summary";
    case "spam": return "Confirm spam";
    case "reply": return "Insert into reply";
    case "macro": return "Acknowledge macro suggestion";
    case "kb_article": return "Accept KB suggestions";
    case "duplicate": return "Link as duplicate";
    case "handoff_summary": return "Acknowledge summary";
    case "root_cause_cluster": return "Acknowledge root cause";
    default: return assertNever(suggestion);
  }
}

interface SuggestionBodyProps {
  suggestion: AiSuggestion;
  macros: SupportMacro[];
}

function SuggestionBody({ suggestion, macros }: SuggestionBodyProps) {
  switch (suggestion.type) {
    case "summary":
      return <p className="text-xs text-foreground/90 whitespace-pre-wrap">{suggestion.payload.text}</p>;
    case "sentiment":
      return <Badge variant="outline" className="text-micro capitalize">{suggestion.payload.sentiment}</Badge>;
    case "category":
      return <Badge variant="outline" className="text-micro">{suggestion.payload.category}</Badge>;
    case "priority":
      return <Badge variant="outline" className="text-micro">{suggestion.payload.priority}</Badge>;
    case "spam":
      return (
        <div className="flex items-center gap-1.5 text-xs text-red-700 dark:text-red-400 bg-destructive/10 rounded px-2 py-1">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          Flagged as likely spam
        </div>
      );
    case "reply": {
      const replySources = suggestion.payload.sources;
      return (
        <div className="space-y-1">
          <p className="text-xs text-foreground/90 whitespace-pre-wrap line-clamp-6">{suggestion.payload.body}</p>
          {replySources && replySources.length > 0 && (
            <AiCitationChips citations={sourcesToCitations(replySources)} />
          )}
        </div>
      );
    }
    case "macro": {
      const macro = macros.find((m) => m.id === suggestion.payload.macroId);
      return (
        <p className="text-xs text-foreground/90">
          {macro ? `${macro.title} — ` : ""}{suggestion.payload.reason}
        </p>
      );
    }
    case "kb_article":
      return (
        <ul className="space-y-1">
          {suggestion.payload.articles.map((article) => (
            <li key={article.articleId} className="flex items-center justify-between gap-2 text-xs">
              <TruncatedText text={article.title} />
              <span className="text-micro text-muted-foreground shrink-0">{Math.round(article.similarity * 100)}%</span>
            </li>
          ))}
        </ul>
      );
    case "duplicate":
      return (
        <p className="text-xs text-foreground/90">
          Ticket #{suggestion.payload.candidateTicketId} — {suggestion.payload.title}
        </p>
      );
    case "handoff_summary": {
      const handoffSources = suggestion.payload.sources;
      return (
        <div className="space-y-1.5">
          <p className="text-xs text-foreground/90 whitespace-pre-wrap">{suggestion.payload.summary}</p>
          {suggestion.payload.keyPoints.length > 0 && (
            <ul className="list-disc list-inside text-dense text-muted-foreground space-y-0.5">
              {suggestion.payload.keyPoints.map((point, i) => <li key={i}>{point}</li>)}
            </ul>
          )}
          <p className="text-dense font-medium text-foreground/80">Next step: {suggestion.payload.suggestedNextStep}</p>
          {handoffSources && handoffSources.length > 0 && (
            <AiCitationChips citations={sourcesToCitations(handoffSources)} />
          )}
        </div>
      );
    }
    case "root_cause_cluster":
      return (
        <div className="space-y-1">
          <p className="text-xs font-medium text-foreground/90">{suggestion.payload.rootCause}</p>
          <p className="text-dense text-muted-foreground">{suggestion.payload.summary}</p>
          <p className="text-dense text-muted-foreground">Related: {suggestion.payload.relatedTicketIds.map((id) => `#${id}`).join(", ")}</p>
        </div>
      );
    default:
      return assertNever(suggestion);
  }
}

interface PendingSuggestionCardProps {
  suggestion: AiSuggestion;
  macros: SupportMacro[];
  isResolvePending: boolean;
  ticketId: number;
  replyDraftContent?: string;
  onAccept: (suggestion: AiSuggestion) => void;
  onReject: (suggestionId: number) => void;
  onInsertReply?: (body: string) => void;
}

export function PendingSuggestionCard({
  suggestion,
  macros,
  isResolvePending,
  ticketId,
  replyDraftContent,
  onAccept,
  onReject,
  onInsertReply,
}: PendingSuggestionCardProps) {
  const conf = suggestion.confidence !== null ? Number(suggestion.confidence) : null;
  const isReply = suggestion.type === "reply";
  const draftContent = replyDraftContent ?? (isReply ? suggestion.payload.body : "");

  return (
    <div className="rounded-md border border-border/60 p-2 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
          <span className="text-micro font-medium text-muted-foreground uppercase tracking-wide shrink-0">
            {suggestionTypeLabel(suggestion.type)}
          </span>
          {conf !== null && !Number.isNaN(conf) && (
            <AiConfidenceBadge confidence={conf} />
          )}
          {isReply && suggestion.payload.escalated && (
            <Badge
              variant="outline"
              className="text-[9px] px-1 py-0 gap-0.5 text-amber-600 border-amber-300 bg-amber-50 dark:text-amber-400 dark:border-amber-500/40 dark:bg-amber-500/10 shrink-0"
            >
              <AlertTriangle className="h-2.5 w-2.5" />
              Escalate
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <AnimatedIconButton
            type="button" variant="ghost" size="icon"
            className="h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30"
            aria-label={`Helpful — ${acceptLabel(suggestion)}`}
            title={`Helpful — ${acceptLabel(suggestion)}`}
            disabled={isResolvePending}
            onClick={() => onAccept(suggestion)}
            icon={ThumbsUpIcon}
          />
          <AnimatedIconButton
            type="button" variant="ghost" size="icon"
            className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
            aria-label="Not helpful — dismiss suggestion"
            title="Not helpful — dismiss suggestion"
            disabled={isResolvePending}
            onClick={() => onReject(suggestion.id)}
            icon={ThumbsDownIcon}
          />
        </div>
      </div>
      <SuggestionBody suggestion={suggestion} macros={macros} />
      {isReply && (
        <div className="space-y-1 pt-1 border-t border-border/40">
          <ReplyImprovementSection
            ticketId={ticketId}
            currentContent={draftContent}
            onApply={onInsertReply ?? ((_) => undefined)}
          />
          <TranslateDraftSection
            ticketId={ticketId}
            currentContent={draftContent}
            onApply={onInsertReply ?? ((_) => undefined)}
          />
        </div>
      )}
    </div>
  );
}

interface ResolvedSuggestionCardProps {
  suggestion: AiSuggestion;
  macros: SupportMacro[];
}

export function ResolvedSuggestionCard({ suggestion, macros }: ResolvedSuggestionCardProps) {
  return (
    <div className="rounded-md border border-border/30 bg-muted/30 p-2 space-y-1 opacity-70">
      <div className="flex items-center justify-between gap-2">
        <span className="text-micro font-medium text-muted-foreground uppercase tracking-wide">
          {suggestionTypeLabel(suggestion.type)}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {suggestion.feedback && (
            suggestion.feedback === "helpful"
              ? <ThumbsUp className="h-3 w-3 text-green-600" aria-label="Marked helpful" />
              : <ThumbsDown className="h-3 w-3 text-red-600" aria-label="Marked not helpful" />
          )}
          <Badge variant="outline" className="text-[9px] px-1.5 py-0 capitalize">{suggestion.status}</Badge>
        </div>
      </div>
      <SuggestionBody suggestion={suggestion} macros={macros} />
    </div>
  );
}
