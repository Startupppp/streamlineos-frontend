"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmWithReasonSheet } from "@/components/ui/confirm-with-reason-sheet";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/date-utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import {
  useEraseInterviewTranscript,
  useInterviewTranscript,
  useStoreInterviewTranscript,
} from "@/hooks/api/hr/recruitment/interview-transcript";

interface Props {
  interviewId: number;
}

export function TranscriptPanel({ interviewId }: Props) {
  const canManage = useCan("hr:interviews:manage");
  const { data, isLoading, isError } = useInterviewTranscript(interviewId, canManage);
  const store = useStoreInterviewTranscript(interviewId);
  const erase = useEraseInterviewTranscript(interviewId);

  const [text, setText] = useState("");
  const [consented, setConsented] = useState(false);
  const [confirmingErase, setConfirmingErase] = useState(false);

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => setText(e.target.value),
    [],
  );
  const handleConsentChange = useCallback((next: boolean | "indeterminate") => {
    setConsented(next === true);
  }, []);
  const handleOpenErase = useCallback(() => setConfirmingErase(true), []);
  const handleEraseOpenChange = useCallback((open: boolean) => setConfirmingErase(open), []);

  const handleSave = useCallback(() => {
    if (!text.trim()) {
      toast.error("Paste the transcript before saving.");
      return;
    }
    store.mutate(
      { text: text.trim(), consentAt: new Date().toISOString() },
      {
        onSuccess: () => {
          toast.success("Transcript saved");
          setText("");
          setConsented(false);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [store, text]);

  const handleErase = useCallback(
    (reason: string) => {
      erase.mutate(reason, {
        onSuccess: (result) => {
          toast.success(result.erased ? "Transcript erased" : "There was no transcript to erase");
          setConfirmingErase(false);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    },
    [erase],
  );

  if (!canManage) {
    return (
      <p className="text-xs text-muted-foreground">
        Transcripts need the interview management permission. Every read of one is recorded.
      </p>
    );
  }
  if (isLoading) return <Skeleton className="h-24 w-full" />;
  if (isError || !data) {
    return (
      <p className="text-xs text-muted-foreground">
        The transcript could not be loaded. Nothing has been changed.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {data.transcript ? (
        <div className="space-y-2">
          <div className="rounded-md border bg-muted/40 px-3 py-2 max-h-64 overflow-y-auto">
            <p className="text-xs whitespace-pre-wrap text-foreground">{data.transcript}</p>
          </div>
          
          <p className="text-xs text-muted-foreground">
            {data.source === "MANUAL_UPLOAD" ? "Uploaded by hand" : "From the transcription vendor"}
            {data.storedAt ? ` on ${formatDateTime(data.storedAt)}` : ""}
            {data.consentAt ? ` · consent recorded ${formatDateTime(data.consentAt)}` : ""}
            {data.retainUntil ? ` · kept until ${formatDateTime(data.retainUntil)}` : ""}
          </p>
          <Button variant="ghost" size="sm" onClick={handleOpenErase}>
            Erase transcript
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          
          {data.providerBlockedReason && (
            <p className="text-xs text-muted-foreground rounded-md border bg-muted/40 px-3 py-2">
              {data.providerBlockedReason}
            </p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor={`transcript-${interviewId}`}>Transcript</Label>
            <Textarea
              id={`transcript-${interviewId}`}
              rows={6}
              value={text}
              onChange={handleTextChange}
              placeholder="Paste the transcript of the interview."
            />
          </div>

          <div className="flex items-start gap-2 rounded-md border px-3 py-2">
            <Checkbox
              id={`transcript-consent-${interviewId}`}
              checked={consented}
              onCheckedChange={handleConsentChange}
            />
            <Label
              htmlFor={`transcript-consent-${interviewId}`}
              className="text-xs font-normal leading-snug"
            >
              The candidate was told this interview would be recorded or transcribed, and agreed.
            </Label>
          </div>

          <LoadingButton
            size="sm"
            onClick={handleSave}
            isPending={store.isPending}
            disabled={!consented || !text.trim()}
          >
            Save transcript
          </LoadingButton>
        </div>
      )}

      <ConfirmWithReasonSheet
        open={confirmingErase}
        onOpenChange={handleEraseOpenChange}
        destructive
        title="Erase this transcript?"
        description="The text is removed from the interview permanently and the erasure is recorded in the audit log with your reason. The rest of the interview — result, scorecard, notes — is untouched."
        reasonLabel="Why is this being erased?"
        reasonPlaceholder="e.g. the candidate asked for their interview record to be deleted"
        reasonRequired
        confirmLabel="Erase transcript"
        onConfirm={handleErase}
        isPending={erase.isPending}
      />
    </div>
  );
}
