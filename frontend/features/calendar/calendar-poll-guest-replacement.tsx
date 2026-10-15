"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getErrorMessage } from "@/lib/get-error-message";
import { useReplaceSchedulingPollGuest } from "@/hooks/api/calendar/scheduling-polls";
import type { ReplacedSchedulingPollGuest, SchedulingPoll } from "@/hooks/api/calendar/scheduling-polls-schema";

type GuestVoter = NonNullable<SchedulingPoll["guestVoters"]>[number];

export function CalendarPollGuestReplacement({ pollId, guest, onReplaced }: {
  pollId: string;
  guest: GuestVoter;
  onReplaced: (result: ReplacedSchedulingPollGuest) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState(guest.email ?? "");
  const [name, setName] = useState(guest.name ?? "");
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const replace = useReplaceSchedulingPollGuest();

  async function save() {
    try {
      const result = await replace.mutateAsync({
        pollId,
        voterId: guest.voterId,
        expectedVoterVersion: guest.voterVersion,
        email: email.trim(),
        name: name.trim() || null,
      });
      setLink(`${window.location.origin}/calendar/polls/${encodeURIComponent(result.token)}`);
      setEditing(false);
      setError(null);
      onReplaced(result);
      toast.success("Guest link replaced");
    } catch (cause) {
      setError(getErrorMessage(cause));
    }
  }

  return <div className="space-y-2 rounded-md border p-2 text-sm">
    <div className="flex items-center justify-between gap-2"><span>{guest.name ? `${guest.name} · ` : ""}{guest.email}</span><Button size="sm" variant="outline" onClick={() => setEditing(!editing)}>Correct guest</Button></div>
    {editing ? <div className="space-y-2">
      <div><Label htmlFor={`poll-guest-email-${guest.voterId}`}>New guest email</Label><Input id={`poll-guest-email-${guest.voterId}`} type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></div>
      <div><Label htmlFor={`poll-guest-name-${guest.voterId}`}>Guest name</Label><Input id={`poll-guest-name-${guest.voterId}`} value={name} onChange={(event) => setName(event.target.value)} /></div>
      <Button size="sm" disabled={replace.isPending} onClick={() => void save()}>Replace signed link</Button>
    </div> : null}
    {error ? <p role="alert" className="text-destructive">{error}</p> : null}
    {link ? <div className="space-y-1"><Label htmlFor={`poll-new-link-${guest.voterId}`}>New guest voting link</Label><Input id={`poll-new-link-${guest.voterId}`} readOnly value={link} /><Button size="sm" variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(link); toast.success("Voting link copied"); } catch { toast.error("Could not copy the link"); } }}>Copy link</Button></div> : null}
  </div>;
}
