"use client";

import { useState, useCallback } from "react";
import { Sparkles, CalendarDays, ClipboardList, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { LoadingButton } from "@/components/ui/loading-button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { AiDraftCard } from "@/components/ai/ai-draft-card";
import { AiCitationChips } from "@/components/ai/ai-citation-chips";
import { AiPermissionDenied } from "@/components/ai/ai-permission-denied";
import { CalendarConnectInline } from "@/features/calendar/calendar-connect-inline";
import { useCan } from "@/hooks/api/access";
import { useCalendarConnections } from "./use-calendar-connections";
import {
  useMeetingPrep,
  type MeetingPrepResult,
} from "@/hooks/api/meetings-ai";
import { getErrorMessage } from "@/lib/get-error-message";

interface MeetingPrepPanelProps {
  eventId: string;
  eventTitle: string;
}

function PrepSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-3 w-1/2 mt-2" />
    </div>
  );
}

export function MeetingPrepPanel({ eventId, eventTitle }: MeetingPrepPanelProps) {
  const canUse = useCan("calendar:ai:use");
  const { data: connections = [] } = useCalendarConnections();
  const hasConnectedCalendar = connections.some((c) => c.status === "active");

  const [includeCrm, setIncludeCrm] = useState(false);
  const [includeProject, setIncludeProject] = useState(false);
  const [result, setResult] = useState<MeetingPrepResult | null>(null);

  const { mutate: runPrep, isPending } = useMeetingPrep();

  const handleDraftAgenda = useCallback(() => {
    runPrep(
      {
        eventId,
        includeCrmContext: includeCrm,
        includeProjectContext: includeProject,
      },
      {
        onSuccess: (data) => setResult(data),
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }, [runPrep, eventId, includeCrm, includeProject]);

  const handleDiscard = useCallback(() => {
    setResult(null);
  }, []);

  const handleToggleCrm = useCallback(() => {
    setIncludeCrm((prev) => !prev);
  }, []);

  const handleToggleProject = useCallback(() => {
    setIncludeProject((prev) => !prev);
  }, []);

  if (!canUse) {
    return <AiPermissionDenied />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-muted-foreground" aria-hidden />
        <p className="text-sm font-medium text-foreground">Meeting Prep AI</p>
      </div>

      {!hasConnectedCalendar && (
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <div className="flex items-start gap-2 mb-2">
            <AlertCircle className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" aria-hidden />
            <p className="text-xs text-muted-foreground">
              Connect Google Calendar or Outlook to include external event context.
            </p>
          </div>
          <CalendarConnectInline />
        </div>
      )}

      {!result && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden />
            <span className="text-xs text-muted-foreground truncate min-w-0">{eventTitle}</span>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Include context from
            </p>
            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeCrm}
                  onChange={handleToggleCrm}
                  className="h-3.5 w-3.5 rounded border-border accent-primary"
                />
                <Label className="text-xs cursor-pointer font-normal">CRM (deals, contacts)</Label>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeProject}
                  onChange={handleToggleProject}
                  className="h-3.5 w-3.5 rounded border-border accent-primary"
                />
                <Label className="text-xs cursor-pointer font-normal">Projects & tickets</Label>
              </label>
            </div>
          </div>

          {isPending ? (
            <PrepSkeleton />
          ) : (
            <LoadingButton
              size="sm"
              isPending={isPending}
              loadingText="Drafting agenda…"
              onClick={handleDraftAgenda}
              className="w-full h-8 text-xs gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Draft Agenda
            </LoadingButton>
          )}
        </div>
      )}

      {result && (
        <div className="space-y-3">
          <AiDraftCard
            title="Meeting Agenda"
            citations={result.agenda.citations.map((c) => ({
              id: c.id,
              title: c.title,
              snippet: c.snippet,
            }))}
            onDiscard={handleDiscard}
          >
            <div className="space-y-2">
              <p className="text-xs text-foreground whitespace-pre-line leading-relaxed">
                {result.agenda.agenda}
              </p>
              {result.agenda.preparationNotes && (
                <>
                  <Separator />
                  <div className="flex items-start gap-1.5">
                    <ClipboardList className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" aria-hidden />
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {result.agenda.preparationNotes}
                    </p>
                  </div>
                </>
              )}
            </div>
          </AiDraftCard>

          {result.agenda.keyTopics.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Key topics
              </p>
              <div className="flex flex-wrap gap-1">
                {result.agenda.keyTopics.map((topic) => (
                  <Badge key={topic} variant="secondary" className="text-[10px] h-5 px-1.5">
                    {topic}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {result.agenda.suggestedDuration && (
            <p className="text-xs text-muted-foreground">
              Suggested duration: <span className="font-medium text-foreground">{result.agenda.suggestedDuration}</span>
            </p>
          )}

          {result.agenda.citations.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sources</p>
              <AiCitationChips
                citations={result.agenda.citations.map((c) => ({
                  id: c.id,
                  title: c.title,
                  snippet: c.snippet,
                }))}
              />
            </div>
          )}

          {!result.connectedIntegrations && (
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
              <div className="flex items-start gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" aria-hidden />
                <p className="text-xs text-muted-foreground">
                  Connect Google Calendar or Outlook to include external event context.
                </p>
              </div>
              <CalendarConnectInline />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
