"use client";

import { useParams, useSearchParams } from "next/navigation";
import { format, isSameDay } from "date-fns";
import { CalendarDays, Check, Clock3, ExternalLink, Loader2, MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getErrorMessage } from "@/lib/get-error-message";
import { usePublicCalendarMeetingWorkspace } from "@/hooks/api/calendar-meeting-workspace";
import {
  usePublicCalendarInvitation,
  usePublicCalendarInvitationRsvp,
  type PublicCalendarInvitationPurpose,
  type PublicCalendarInvitationRsvp,
} from "@/hooks/api/calendar-invitations-public";

const responses: Array<{
  status: PublicCalendarInvitationRsvp;
  label: string;
  icon: typeof Check;
  variant: "default" | "outline" | "destructive";
}> = [
  { status: "accepted", label: "Accept", icon: Check, variant: "default" },
  { status: "tentative", label: "Maybe", icon: Clock3, variant: "outline" },
  { status: "declined", label: "Decline", icon: X, variant: "destructive" },
];

function isPurpose(value: string): value is PublicCalendarInvitationPurpose {
  return value === "rsvp" || value === "join";
}

export default function CalendarInvitationPage() {
  const params = useParams<{ purpose: string }>();
  const searchParams = useSearchParams();
  const purpose = isPurpose(params.purpose) ? params.purpose : "rsvp";
  const token = searchParams.get("token") ?? "";
  const invitationQuery = usePublicCalendarInvitation(purpose, token);
  const rsvp = usePublicCalendarInvitationRsvp(token);
  const invitation = invitationQuery.isError ? undefined : invitationQuery.data;
  const workspaceQuery = usePublicCalendarMeetingWorkspace(token, purpose === "join" && Boolean(invitation));
  const workspace = workspaceQuery.isError ? undefined : workspaceQuery.data;

  function respond(status: PublicCalendarInvitationRsvp) {
    rsvp.mutate(status);
  }

  return (
    <main className="flex min-h-dvh justify-center bg-background px-4 py-6 text-foreground sm:px-6 sm:py-12">
      <Card className="h-fit w-full max-w-2xl gap-0 overflow-hidden rounded-xl border-border bg-card py-0 shadow-sm">
        <div className="h-1 bg-primary" aria-hidden="true" />
        <header className="flex items-center gap-4 border-b border-border px-5 py-6 sm:px-8 sm:py-7">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <CalendarDays className="size-6" aria-hidden="true" />
          </span>
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-medium text-muted-foreground">StreamlineOS Calendar</p>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              {purpose === "join" ? "Join your meeting" : "Calendar invitation"}
            </h1>
          </div>
        </header>
        <div className="px-5 py-6 sm:px-8 sm:py-8">
          {invitationQuery.isPending && (
            <div className="flex min-h-48 items-center justify-center" aria-label="Loading invitation">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {invitationQuery.isError && (
            <div className="space-y-2 py-10 text-center" role="alert">
              <p className="text-lg font-semibold text-foreground">This link is no longer available</p>
              <p className="text-sm text-muted-foreground">
                {getErrorMessage(invitationQuery.error) || "Ask the organizer for a new invitation."}
              </p>
            </div>
          )}

          {invitation && (
            <div className="space-y-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {invitation.role} attendee
                </p>
                <h2 className="mt-1 text-xl font-semibold text-foreground">{invitation.title}</h2>
              </div>

              <div className="rounded-xl border bg-muted/30 p-4">
                <div className="flex items-start gap-3">
                  <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                  <div>
                    <p className="font-medium text-foreground">
                      <time dateTime={invitation.startAt}>{format(new Date(invitation.startAt), "EEEE, MMMM d, yyyy")}</time>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <time dateTime={invitation.startAt}>{format(new Date(invitation.startAt), "h:mm a")}</time> – <time dateTime={invitation.endAt}>{format(new Date(invitation.endAt), isSameDay(new Date(invitation.startAt), new Date(invitation.endAt)) ? "h:mm a" : "EEEE, MMMM d, yyyy 'at' h:mm a")}</time>
                    </p>
                  </div>
                </div>
              </div>

              {purpose === "rsvp" && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground" aria-live="polite">
                    {rsvp.isSuccess
                      ? `Your response is ${rsvp.data.rsvpStatus}.`
                      : invitation.rsvpStatus === "pending"
                        ? "Will you attend?"
                        : `Your current response is ${invitation.rsvpStatus}.`}
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {responses.map((response) => {
                      const Icon = response.icon;
                      return (
                        <Button
                          key={response.status}
                          type="button"
                          variant={response.variant}
                          disabled={rsvp.isPending}
                          onClick={() => respond(response.status)}
                          aria-pressed={(rsvp.data?.rsvpStatus ?? invitation.rsvpStatus) === response.status}
                        >
                          {rsvp.isPending && rsvp.variables === response.status
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <Icon className="h-4 w-4" />}
                          {response.label}
                        </Button>
                      );
                    })}
                  </div>
                  {rsvp.isError && (
                    <p className="text-sm text-destructive" role="alert">
                      {getErrorMessage(rsvp.error) || "Your response could not be saved. Try again."}
                    </p>
                  )}
                </div>
              )}

              {purpose === "join" && invitation.meetingUrl && (
                <Button asChild className="w-full">
                  <a href={invitation.meetingUrl} rel="noreferrer noopener">
                    <ExternalLink className="h-4 w-4" />
                    Join meeting
                  </a>
                </Button>
              )}

              {purpose === "join" && !invitation.meetingUrl && (
                <div className="flex items-start gap-3 rounded-xl border p-4" role="status">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <p className="text-sm text-muted-foreground">
                    The organizer has not added an online meeting link. Check the latest invitation update.
                  </p>
                </div>
              )}

              {purpose === "join" && workspace && (workspace.sharedContexts.length > 0 || workspace.sharedNotes.length > 0 || workspace.sharedDrafts.length > 0) && (
                <section className="space-y-4 border-t border-border pt-5" aria-label="Shared meeting workspace">
                  <div>
                    <h3 className="font-semibold text-foreground">Shared meeting workspace</h3>
                    <p className="text-sm text-muted-foreground">Content the organizer shared with invited guests.</p>
                  </div>
                  {workspace.sharedContexts.map((context) => (
                    <div key={context.id} className="rounded-lg border border-border bg-muted/30 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{context.contextType.toLowerCase()} context</p>
                        <Badge variant="outline">{context.state.replaceAll("_", " ").toLowerCase()}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">Source content is available to authorized members only.</p>
                    </div>
                  ))}
                  {workspace.sharedNotes.map((note) => (
                    <article key={note.id} className="rounded-lg border border-border p-3">
                      <p className="text-xs font-medium text-muted-foreground">{note.kind.toLowerCase()}</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm">{note.content}</p>
                    </article>
                  ))}
                  {workspace.sharedDrafts.map((draft) => (
                    <article key={draft.id} className="rounded-lg border border-border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium text-muted-foreground">{draft.kind.replaceAll("_", " ").toLowerCase()}</p>
                        <Badge variant="outline">{draft.status.toLowerCase()}</Badge>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-sm">{draft.content}</p>
                      {draft.sourceOutcomeUnavailable && <p className="mt-2 text-xs text-status-warning-foreground">Source action status is temporarily unavailable.</p>}
                    </article>
                  ))}
                </section>
              )}

              {purpose === "join" && workspaceQuery.isError && (
                <p role="status" className="text-sm text-muted-foreground">Shared meeting content is unavailable right now.</p>
              )}
            </div>
          )}
        </div>
      </Card>
    </main>
  );
}
