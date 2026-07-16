"use client";

import { useState, useCallback } from "react";
import { Sparkles, Send, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AiDraftCard } from "@/components/ai/ai-draft-card";
import { AiPermissionDenied } from "@/components/ai/ai-permission-denied";
import { CalendarConnectInline } from "@/features/calendar/calendar-connect-inline";
import { useCan } from "@/hooks/api/access";
import {
  useMeetingFollowUp,
  useProposeMeetingSend,
  useConfirmMeetingSend,
  type MeetingFollowUpResult,
  type ActionItem,
} from "@/hooks/api/meetings-ai";
import { getErrorMessage } from "@/lib/get-error-message";

interface MeetingFollowUpPanelProps {
  eventId: string;
  eventTitle: string;
  onClose?: () => void;
}

const MAX_ACTION_ITEMS = 20;

function FollowUpSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  );
}

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

interface DraftedActionItemProps {
  item: ActionItem;
  index: number;
}

function DraftedActionItem({ item, index }: DraftedActionItemProps) {
  return (
    <div className="flex items-start gap-1.5 text-xs">
      <span className="text-muted-foreground shrink-0 tabular-nums mt-0.5">{index + 1}.</span>
      <div className="flex-1 min-w-0">
        <p className="text-foreground">{item.item}</p>
        {(item.assignee ?? item.dueDate) && (
          <p className="text-muted-foreground text-[10px] mt-0.5">
            {item.assignee && <span>→ {item.assignee}</span>}
            {item.assignee && item.dueDate && <span className="mx-1">·</span>}
            {item.dueDate && <span>{item.dueDate}</span>}
          </p>
        )}
      </div>
    </div>
  );
}

export function MeetingFollowUpPanel({ eventId, eventTitle: _eventTitle, onClose }: MeetingFollowUpPanelProps) {
  const canUse = useCan("calendar:ai:use");

  const [meetingNotes, setMeetingNotes] = useState("");
  const [actionItems, setActionItems] = useState<string[]>([""]);
  const [draft, setDraft] = useState<MeetingFollowUpResult | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [proposalToken, setProposalToken] = useState<string | null>(null);
  const [needsReauth, setNeedsReauth] = useState(false);

  const { mutate: runFollowUp, isPending: followUpPending } = useMeetingFollowUp();
  const { mutate: proposeSend, isPending: proposePending } = useProposeMeetingSend();
  const { mutate: confirmSend, isPending: confirmPending } = useConfirmMeetingSend();

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
    runFollowUp(
      {
        eventId,
        meetingNotes: meetingNotes.trim() || undefined,
        actionItems: filledItems.length > 0 ? filledItems : undefined,
      },
      {
        onSuccess: (data) => setDraft(data),
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }, [runFollowUp, eventId, meetingNotes, actionItems]);

  const handleDiscard = useCallback(() => {
    setDraft(null);
  }, []);

  const handleSendViaCalendar = useCallback(() => {
    if (!draft) return;
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

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Send className="h-4 w-4 text-muted-foreground" aria-hidden />
          <p className="text-sm font-medium text-foreground">Follow-up Draft</p>
        </div>

        {!draft && (
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

            {followUpPending ? (
              <FollowUpSkeleton />
            ) : (
              <LoadingButton
                size="sm"
                isPending={followUpPending}
                loadingText="Drafting follow-up…"
                onClick={handleDraftFollowUp}
                className="w-full h-8 text-xs gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                Draft Follow-up
              </LoadingButton>
            )}
          </div>
        )}

        {draft && (
          <div className="space-y-3">
            <AiDraftCard title="Follow-up Email" onDiscard={handleDiscard}>
              <div className="space-y-2">
                <p className="text-xs font-medium text-foreground">
                  Subject: <span className="font-normal">{draft.subject}</span>
                </p>
                <Separator />
                <p className="text-xs text-foreground whitespace-pre-line leading-relaxed">
                  {draft.body}
                </p>

                {draft.actionItems.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Action items
                      </p>
                      <div className="space-y-1.5">
                        {draft.actionItems.map((item, i) => (
                          <DraftedActionItem key={i} item={item} index={i} />
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {draft.nextMeetingDate && (
                  <>
                    <Separator />
                    <p className="text-xs text-muted-foreground">
                      Next meeting suggested:{" "}
                      <span className="font-medium text-foreground">{draft.nextMeetingDate}</span>
                    </p>
                  </>
                )}
              </div>
            </AiDraftCard>

            <div className="flex gap-2">
              <LoadingButton
                size="sm"
                isPending={proposePending}
                loadingText="Preparing…"
                onClick={handleSendViaCalendar}
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
              {!confirmPending && <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />}
              Confirm
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
