"use client";

import { useState, useCallback, useMemo } from "react";
import { Sparkles, Send, CheckCircle2, AlertCircle, StopCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AiDraftCard } from "@/components/ai/ai-draft-card";
import { AiFailureBody } from "@/components/ai/ai-failure-body";
import { classifyAiError, isRetryableAiFailure } from "@/components/ai/ai-error-state";
import { AiPermissionDenied } from "@/components/ai/ai-permission-denied";
import { CalendarConnectInline } from "@/features/calendar/calendar-connect-inline";
import { useCan } from "@/hooks/api/access";
import { useAiTextStream } from "@/hooks/api/ai-text-stream";
import {
  streamMeetingFollowUp,
  useProposeMeetingSend,
  useConfirmMeetingSend,
  type AgendaCitation,
} from "@/hooks/api/meetings-ai";
import { getErrorMessage } from "@/lib/get-error-message";
import { parseFollowUpStream, isSendableFollowUp } from "./meeting-follow-up-stream-parse";
import { FollowUpDraftBody } from "./meeting-follow-up-draft";

interface MeetingFollowUpPanelProps {
  eventId: string;
  onClose?: () => void;
}

const MAX_ACTION_ITEMS = 20;

type FollowUpState =
  | { status: "idle" }
  | { status: "streaming"; text: string }
  | { status: "cancelled"; text: string }
  | { status: "done"; text: string }
  | { status: "failed"; error: unknown };

interface ActionItemRowProps {
  value: string;
  index: number;
  onChange: (index: number, value: string) => void;
  onRemove: (index: number) => void;
}

function ActionItemRow({ value, index, onChange, onRemove }: ActionItemRowProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(index, e.target.value);
    },
    [index, onChange],
  );

  const handleRemove = useCallback(() => {
    onRemove(index);
  }, [index, onRemove]);

  return (
    <div className="flex items-center gap-1.5">
      <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden />
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={`Action item ${index + 1}`}
        className="flex-1 h-7 min-w-0 rounded-md border border-input bg-transparent px-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      />
      <button
        type="button"
        onClick={handleRemove}
        className="text-xs text-muted-foreground hover:text-destructive transition-colors"
        aria-label={`Remove action item ${index + 1}`}
      >
        ×
      </button>
    </div>
  );
}

/**
 * The follow-up streams. The panel still renders the four structured affordances
 * the user had before — subject, email body, action items and a suggested next
 * meeting — but reconstructs them from the text received so far
 * (`parseFollowUpStream`) instead of waiting for a whole buffered record, and
 * hands that same reconstruction to `propose-send`. Stopping keeps everything
 * that arrived, and the citations come off `x-ai-sources` before the first token
 * so a stopped draft still cites what it rests on.
 */
export function MeetingFollowUpPanel({ eventId, onClose }: MeetingFollowUpPanelProps) {
  const canUse = useCan("calendar:ai:use");

  const [meetingNotes, setMeetingNotes] = useState("");
  const [actionItems, setActionItems] = useState<string[]>([""]);
  const [state, setState] = useState<FollowUpState>({ status: "idle" });
  const [citations, setCitations] = useState<AgendaCitation[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [proposalToken, setProposalToken] = useState<string | null>(null);
  const [needsReauth, setNeedsReauth] = useState(false);

  const { run, stop, isStreaming } = useAiTextStream();
  const { mutate: proposeSend, isPending: proposePending } = useProposeMeetingSend();
  const { mutate: confirmSend, isPending: confirmPending } = useConfirmMeetingSend();

  const streamedText = "text" in state ? state.text : "";
  const draft = useMemo(() => parseFollowUpStream(streamedText), [streamedText]);

  const handleNotesChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMeetingNotes(e.target.value);
  }, []);

  const handleActionItemChange = useCallback((index: number, value: string) => {
    setActionItems((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }, []);

  const handleActionItemRemove = useCallback((index: number) => {
    setActionItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleAddActionItem = useCallback(() => {
    setActionItems((prev) => {
      if (prev.length >= MAX_ACTION_ITEMS) return prev;
      return [...prev, ""];
    });
  }, []);

  const handleDraftFollowUp = useCallback(() => {
    const filledItems = actionItems.filter((item) => item.trim().length > 0);
    setState({ status: "streaming", text: "" });
    setCitations([]);

    const appendToken = (token: string) => {
      setState((prev) =>
        prev.status === "streaming" ? { status: "streaming", text: prev.text + token } : prev,
      );
    };

    void run((signal) =>
      streamMeetingFollowUp({
        eventId,
        meetingNotes: meetingNotes.trim() || undefined,
        actionItems: filledItems.length > 0 ? filledItems : undefined,
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
  }, [run, eventId, meetingNotes, actionItems]);

  const handleDiscard = useCallback(() => {
    setState({ status: "idle" });
    setCitations([]);
  }, []);

  const handleSendViaCalendar = useCallback(() => {
    if (!isSendableFollowUp(draft)) return;
    proposeSend(
      { eventId, followUpDraft: draft, channel: "calendar" },
      {
        onSuccess: (data) => {
          setProposalToken(data.token);
          setConfirmOpen(true);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }, [proposeSend, eventId, draft]);

  const handleConfirmSend = useCallback(() => {
    if (!proposalToken) return;
    confirmSend(
      { token: proposalToken },
      {
        onSuccess: (data) => {
          setConfirmOpen(false);
          if (data.executed) {
            toast.success("Follow-up saved to calendar event");
            onClose?.();
          } else if (data.error === "auth_required") {
            setNeedsReauth(true);
          } else {
            toast.error(data.message ?? "Failed to send follow-up");
          }
        },
        onError: (error) => {
          setConfirmOpen(false);
          toast.error(getErrorMessage(error));
        },
      },
    );
  }, [confirmSend, proposalToken, onClose]);

  const handleConfirmOpenChange = useCallback((open: boolean) => {
    setConfirmOpen(open);
  }, []);

  const handleCancelConfirm = useCallback(() => {
    setConfirmOpen(false);
  }, []);

  const handleDoneNoSend = useCallback(() => {
    onClose?.();
  }, [onClose]);

  if (!canUse) {
    return <AiPermissionDenied />;
  }

  if (needsReauth) {
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3">
          <AlertCircle className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" aria-hidden />
          <p className="text-xs text-muted-foreground">
            Calendar reconnection required to send the follow-up.
          </p>
        </div>
        <CalendarConnectInline />
      </div>
    );
  }

  /**
   * Exhausted credits and a revoked permission do not get a dispatch control.
   * `AiFailureBody` already renders the affordance that can help — the top-up
   * link, or the denial reason — and a "Try again" beside it would spend another
   * click on a call that cannot succeed.
   */
  const canDispatch =
    state.status !== "failed" || isRetryableAiFailure(classifyAiError(state.error).status);
  const showForm = (state.status === "idle" || state.status === "failed") && canDispatch;
  const showDraft = state.status !== "idle" && state.status !== "failed";

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Send className="h-4 w-4 text-muted-foreground" aria-hidden />
          <p className="text-sm font-medium text-foreground">Follow-up Draft</p>
        </div>

        {state.status === "failed" && (
          <AiFailureBody error={state.error} onRetry={handleDraftFollowUp} />
        )}

        {showForm && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide" htmlFor="meeting-notes">
                Meeting notes <span className="font-normal normal-case">(optional)</span>
              </label>
              <Textarea
                id="meeting-notes"
                placeholder="What was discussed, decisions made…"
                value={meetingNotes}
                onChange={handleNotesChange}
                className="min-h-[80px] text-xs resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Action items <span className="font-normal normal-case">(optional)</span>
              </p>
              <div className="space-y-1.5">
                {actionItems.map((item, index) => (
                  <ActionItemRow
                    key={index}
                    index={index}
                    value={item}
                    onChange={handleActionItemChange}
                    onRemove={handleActionItemRemove}
                  />
                ))}
              </div>
              {actionItems.length < MAX_ACTION_ITEMS && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleAddActionItem}
                  className="h-7 text-xs text-muted-foreground hover:text-foreground px-1"
                >
                  + Add item
                </Button>
              )}
            </div>

            <Button
              type="button"
              size="sm"
              onClick={handleDraftFollowUp}
              className="w-full h-8 text-xs gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Draft Follow-up
            </Button>
          </div>
        )}

        {showDraft && (
          <div className="space-y-3">
            {state.status === "cancelled" && (
              <Badge variant="outline" className="gap-1 text-micro h-5 px-1.5">
                <StopCircle className="h-3 w-3" aria-hidden />
                Stopped — partial draft kept
              </Badge>
            )}

            <AiDraftCard
              title="Follow-up Email"
              citations={citations.map((c) => ({ id: c.id, title: c.title, snippet: c.snippet }))}
              citationsPending={isStreaming && citations.length === 0}
              onDiscard={handleDiscard}
            >
              <FollowUpDraftBody draft={draft} isStreaming={isStreaming} />
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
              <div className="flex gap-2">
                <LoadingButton
                  size="sm"
                  isPending={proposePending}
                  loadingText="Preparing…"
                  onClick={handleSendViaCalendar}
                  disabled={!isSendableFollowUp(draft)}
                  className="flex-1 h-8 text-xs gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" aria-hidden />
                  Send via Calendar
                </LoadingButton>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDoneNoSend}
                  className="flex-1 h-8 text-xs"
                >
                  Done (no send)
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={confirmOpen} onOpenChange={handleConfirmOpenChange}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Confirm follow-up</DialogTitle>
            <DialogDescription className="text-xs">
              This will update the calendar event description with the follow-up. Proceed?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancelConfirm}
              className="text-xs"
            >
              Cancel
            </Button>
            <LoadingButton
              size="sm"
              isPending={confirmPending}
              loadingText="Saving…"
              onClick={handleConfirmSend}
              className="text-xs gap-1.5"
            >
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
              Confirm
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
