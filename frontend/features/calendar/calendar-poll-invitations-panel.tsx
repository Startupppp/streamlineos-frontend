"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { useMySchedulingPolls, useSchedulingPoll, useVoteSchedulingPoll } from "@/hooks/api/calendar/scheduling-polls";

export function CalendarPollInvitationsPanel({ onBack }: { onBack: () => void }) {
  const [cursor, setCursor] = useState<string | null>(null);
  const [previousCursors, setPreviousCursors] = useState<Array<string | null>>([]);
  const [pollId, setPollId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const polls = useMySchedulingPolls(cursor);
  const detail = useSchedulingPoll(pollId);
  const vote = useVoteSchedulingPoll();

  async function castVote(optionId: string, response: "yes" | "maybe" | "no") {
    if (!pollId) return;
    try {
      await vote.mutateAsync({ pollId, optionId, response });
      setError(null);
      toast.success("Vote saved");
    } catch (cause) {
      setError(getErrorMessage(cause));
    }
  }

  return <div className="space-y-4">
    <Button variant="outline" onClick={onBack}>Back to booking pages</Button>
    <div><h3 className="font-medium">Poll invitations</h3><p className="text-sm text-muted-foreground">Vote on proposed times that include you.</p></div>
    {error ? <p role="alert" className="rounded-md border border-destructive p-2 text-sm text-destructive">{error}</p> : null}
    {pollId ? <div className="space-y-3">
      <Button variant="outline" onClick={() => setPollId(null)}>Back to invitations</Button>
      {detail.access.denied ? <p className="text-sm text-muted-foreground">This poll is unavailable to your account.</p> : detail.access.unavailable || detail.isError ? <ErrorState title="Poll unavailable" error={detail.error} onRetry={() => void detail.refetch()} /> : detail.access.pending || detail.isPending ? <p role="status">Loading poll…</p> : detail.data ? <>
        <div><h4 className="font-medium">{detail.data.title}</h4><p className="text-sm text-muted-foreground">{detail.data.status} · Closes {new Date(detail.data.expiresAt).toLocaleString()}</p></div>
        {detail.data.options.map((option) => <div key={option.id} className="space-y-2 rounded-md border p-3 text-sm"><p>{new Date(option.startAt).toLocaleString()} · {option.status}</p><p className="text-muted-foreground">Yes {option.votes.yes} · Maybe {option.votes.maybe} · No {option.votes.no}</p>{detail.data?.status === "open" && option.status === "proposed" && detail.data.viewer ? <div className="flex gap-2">{(["yes", "maybe", "no"] as const).map((response) => <Button key={response} size="sm" variant={detail.data?.viewer?.responses[option.id] === response ? "default" : "outline"} disabled={vote.isPending} onClick={() => void castVote(option.id, response)} aria-label={`${response} for ${new Date(option.startAt).toLocaleString()}`}>{response}</Button>)}</div> : null}</div>)}
      </> : null}
    </div> : <>
      {polls.access.denied ? <p className="text-sm text-muted-foreground">You do not have access to poll invitations.</p> : polls.access.unavailable || polls.isError ? <ErrorState title="Poll invitations unavailable" error={polls.error} onRetry={() => void polls.refetch()} /> : polls.access.pending || polls.isPending ? <p role="status">Loading invitations…</p> : polls.data?.items.length ? <div className="space-y-2">{polls.data.items.map((poll) => <button key={poll.id} type="button" className="flex w-full items-center justify-between rounded-md border p-3 text-left text-sm hover:bg-muted" onClick={() => setPollId(poll.id)}>{poll.title}<span className="capitalize text-muted-foreground">{poll.status}</span></button>)}</div> : <p className="text-sm text-muted-foreground">No poll invitations yet.</p>}
      <div className="flex gap-2">{previousCursors.length ? <Button variant="outline" onClick={() => { setCursor(previousCursors.at(-1) ?? null); setPreviousCursors(previousCursors.slice(0, -1)); }}>Newer</Button> : null}{polls.data?.nextCursor ? <Button variant="outline" onClick={() => { setPreviousCursors([...previousCursors, cursor]); setCursor(polls.data.nextCursor); }}>Older</Button> : null}</div>
    </>}
  </div>;
}
