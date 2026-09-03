"use client";

import { useState, useCallback, useMemo } from "react";
import { Sparkles, CalendarDays, AlertCircle, StopCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { AiDraftCard } from "@/components/ai/ai-draft-card";
import { AiFailureBody } from "@/components/ai/ai-failure-body";
import { AiPermissionDenied } from "@/components/ai/ai-permission-denied";
import { CalendarConnectInline } from "@/features/calendar/calendar-connect-inline";
import { useCan } from "@/hooks/api/access";
import { useAiTextStream } from "@/hooks/api/ai-text-stream";
import { streamMeetingPrep, type AgendaCitation } from "@/hooks/api/meetings-ai";
import { useCalendarConnections } from "./use-calendar-connections";
import { MeetingPrepAgendaBody, MeetingPrepAgendaDetails } from "./meeting-prep-agenda";
import { parseMeetingAgendaStream, hasAgendaContent } from "./meeting-prep-stream-parse";

interface MeetingPrepPanelProps {
  eventId: string;
  eventTitle: string;
}

type PrepState =
  | { status: "idle" }
  | { status: "streaming"; text: string }
  | { status: "cancelled"; text: string }
  | { status: "done"; text: string }
  | { status: "failed"; error: unknown };

function PrepSkeleton() {
  return (
    <div className="space-y-3" role="status" aria-live="polite" aria-busy>
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-3 w-1/2 mt-2" />
    </div>
  );
}

/**
 * The agenda streams. The panel still renders the four structured affordances
 * the user had before — agenda prose, key topics, suggested duration and
 * preparation notes — but reconstructs them from the text received so far
 * (`parseMeetingAgendaStream`) instead of waiting for a whole buffered record.
 * Stopping keeps everything that arrived, and the citations come off
 * `x-ai-sources` before the first token so a stopped agenda still cites.
 */
export function MeetingPrepPanel({ eventId, eventTitle }: MeetingPrepPanelProps) {
  const canUse = useCan("calendar:ai:use");
  const { data: connections = [] } = useCalendarConnections();
  const hasConnectedCalendar = connections.some((c) => c.status === "active");

  const [includeCrm, setIncludeCrm] = useState(false);
  const [includeProject, setIncludeProject] = useState(false);
  const [state, setState] = useState<PrepState>({ status: "idle" });
  const [citations, setCitations] = useState<AgendaCitation[]>([]);

  const { run, stop, isStreaming } = useAiTextStream();

  const streamedText = "text" in state ? state.text : "";
  const sections = useMemo(() => parseMeetingAgendaStream(streamedText), [streamedText]);

  const handleDraftAgenda = useCallback(() => {
    setState({ status: "streaming", text: "" });
    setCitations([]);

    const appendToken = (token: string) => {
      setState((prev) =>
        prev.status === "streaming" ? { status: "streaming", text: prev.text + token } : prev,
      );
    };

    void run((signal) =>
      streamMeetingPrep({
        eventId,
        includeCrmContext: includeCrm,
        includeProjectContext: includeProject,
        onToken: appendToken,
        onSources: setCitations,
        signal,
      }),
    )
      .then((outcome) => {
        if (outcome.status === "busy") return;
        setState({
          status: outcome.status === "cancelled" ? "cancelled" : "done",
          text: outcome.text,
        });
      })
      .catch((error: unknown) => {
        setState({ status: "failed", error });
      });
  }, [run, eventId, includeCrm, includeProject]);

  const handleDiscard = useCallback(() => {
    setState({ status: "idle" });
    setCitations([]);
  }, []);

  const handleToggleCrm = useCallback(() => {
    setIncludeCrm((prev) => !prev);
  }, []);

  const handleToggleProject = useCallback(() => {
    setIncludeProject((prev) => !prev);
  }, []);

  if (!canUse) return <AiPermissionDenied />;

  const showForm = state.status === "idle" || state.status === "failed";
  const showAgenda = state.status !== "idle" && state.status !== "failed";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-muted-foreground" aria-hidden />
        <p className="text-sm font-medium text-foreground">Meeting Prep AI</p>
      </div>

      {!hasConnectedCalendar && (
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <div className="flex items-start gap-2 mb-2">
            <AlertCircle
              className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0"
              aria-hidden
            />
            <p className="text-xs text-muted-foreground">
              Connect Google Calendar or Outlook to include external event context.
            </p>
          </div>
          <CalendarConnectInline />
        </div>
      )}

      {state.status === "failed" && (
        <AiFailureBody error={state.error} onRetry={handleDraftAgenda} />
      )}

      {showForm && (
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

          <Button
            type="button"
            size="sm"
            onClick={handleDraftAgenda}
            className="w-full h-8 text-xs gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            {state.status === "failed" ? "Try again" : "Draft Agenda"}
          </Button>
        </div>
      )}

      {showAgenda && (
        <div className="space-y-3">
          {state.status === "cancelled" && (
            <Badge variant="outline" className="gap-1 text-micro h-5 px-1.5">
              <StopCircle className="h-3 w-3" aria-hidden />
              Stopped — partial agenda kept
            </Badge>
          )}

          <AiDraftCard
            title="Meeting Agenda"
            citations={citations.map((c) => ({ id: c.id, title: c.title, snippet: c.snippet }))}
            citationsPending={isStreaming && citations.length === 0}
            onDiscard={handleDiscard}
          >
            {hasAgendaContent(sections) ? (
              <MeetingPrepAgendaBody sections={sections} isStreaming={isStreaming} />
            ) : (
              <PrepSkeleton />
            )}
          </AiDraftCard>

          {isStreaming ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={stop}
              className="w-full h-8 text-xs gap-1.5"
            >
              <StopCircle className="h-3.5 w-3.5" aria-hidden />
              Stop
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDraftAgenda}
              className="w-full h-8 text-xs gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Run again
            </Button>
          )}

          <MeetingPrepAgendaDetails sections={sections} citations={citations} />
        </div>
      )}
    </div>
  );
}
