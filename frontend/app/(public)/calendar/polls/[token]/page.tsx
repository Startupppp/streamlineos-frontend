"use client";

import { format } from "date-fns";
import { CalendarCheck2, Clock3, Loader2 } from "lucide-react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  usePublicCalendarPoll,
  usePublicCalendarPollVote,
  type PublicCalendarPollVote,
} from "@/hooks/api/calendar-polls-public";
import { getErrorMessage } from "@/lib/get-error-message";

const choices: Array<{
  response: PublicCalendarPollVote;
  label: string;
  variant: "default" | "outline" | "destructive";
}> = [
  { response: "yes", label: "Yes", variant: "default" },
  { response: "maybe", label: "Maybe", variant: "outline" },
  { response: "no", label: "No", variant: "destructive" },
];

export default function CalendarPollPage() {
  const params = useParams<{ token: string }>();
  const token = params.token ?? "";
  const pollQuery = usePublicCalendarPoll(token);
  const vote = usePublicCalendarPollVote(token);
  const poll = pollQuery.isError ? undefined : pollQuery.data;

  return (
    <main className="min-h-dvh bg-background px-4 py-6 text-foreground sm:px-6 sm:py-12">
      <Card className="mx-auto w-full max-w-2xl gap-0 overflow-hidden rounded-xl border-border bg-card py-0 shadow-sm">
        <div className="h-1 bg-primary" aria-hidden="true" />
        <header className="flex items-center gap-4 border-b border-border px-5 py-6 sm:px-8 sm:py-7">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <CalendarCheck2 className="size-6" aria-hidden="true" />
          </span>
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-medium text-muted-foreground">StreamlineOS Calendar</p>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Scheduling poll</h1>
          </div>
        </header>
        <div className="px-5 py-6 sm:px-8 sm:py-8">
          {pollQuery.isPending && (
            <div className="flex min-h-56 items-center justify-center" aria-label="Loading poll">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {pollQuery.isError && (
            <div className="space-y-2 py-12 text-center" role="alert">
              <p className="text-lg font-semibold text-foreground">This poll is unavailable</p>
              <p className="text-sm text-muted-foreground">
                {getErrorMessage(pollQuery.error) || "Ask the organizer for a new voting link."}
              </p>
            </div>
          )}

          {poll && (
            <div className="space-y-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {poll.viewer?.requirement ?? "invited"} voter
                </p>
                <h2 className="mt-1 text-xl font-semibold text-foreground">{poll.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {poll.status === "open"
                    ? `Vote before ${format(new Date(poll.expiresAt), "PPp")}.`
                    : poll.status === "finalized"
                      ? "The organizer selected a final time."
                      : poll.status === "expired"
                        ? "Voting has ended because this poll expired."
                        : poll.status === "cancelled"
                          ? "The organizer cancelled this poll."
                          : "The organizer is finalizing this poll."}
                </p>
              </div>

              <div className="space-y-3">
                {poll.options.map((option) => {
                  const response = poll.viewer?.responses[option.id];
                  const open = poll.status === "open" && option.status === "proposed";
                  return (
                    <section
                      key={option.id}
                      className="rounded-xl border border-border bg-surface-inset p-4 dark:border-background"
                      aria-label={format(new Date(option.startAt), "PPpp")}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex min-w-0 items-start gap-3">
                          <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                          <div>
                            <p className="font-medium text-foreground">
                              {format(new Date(option.startAt), "EEEE, MMMM d, yyyy")}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(option.startAt), "p")} – {format(new Date(option.endAt), "p")}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-3 text-xs text-muted-foreground" aria-label="Vote totals">
                          <span>{option.votes.yes} yes</span>
                          <span>{option.votes.maybe} maybe</span>
                          <span>{option.votes.no} no</span>
                        </div>
                      </div>

                      {open && (
                        <div className="mt-4 grid grid-cols-3 gap-2">
                          {choices.map((choice) => (
                            <Button
                              key={choice.response}
                              type="button"
                              size="sm"
                              variant={choice.variant}
                              disabled={vote.isPending}
                              aria-pressed={response === choice.response}
                              aria-label={`${choice.label} for ${format(new Date(option.startAt), "PPpp")}`}
                              onClick={() =>
                                vote.mutate({
                                  optionId: option.id,
                                  response: choice.response,
                                })
                              }
                            >
                              {vote.isPending && vote.variables?.optionId === option.id && vote.variables.response === choice.response
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : choice.label}
                            </Button>
                          ))}
                        </div>
                      )}

                      {option.status === "unavailable" && (
                        <p className="mt-3 text-sm text-muted-foreground">This time is no longer available. Your earlier vote remains visible.</p>
                      )}
                    </section>
                  );
                })}
              </div>

              <div aria-live="polite">
                {vote.isSuccess && (
                  <p className="text-sm text-success">Your vote was saved.</p>
                )}
                {vote.isError && (
                  <p className="text-sm text-destructive" role="alert">
                    {getErrorMessage(vote.error) || "Your vote could not be saved. Try again."}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>
    </main>
  );
}
