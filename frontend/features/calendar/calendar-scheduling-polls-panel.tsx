"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ErrorState } from "@/components/shared/error-state";
import { useMemberDirectory } from "@/hooks/api/members/use-member-directory";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCalendarBookingRulePreview } from "@/hooks/api/calendar/booking-rules";
import type { CalendarBookingRule } from "@/hooks/api/calendar/booking-rules-schema";
import {
  useCancelSchedulingPoll,
  useCreateSchedulingPoll,
  useFinalizeSchedulingPoll,
  useSchedulingPoll,
  useSchedulingPolls,
  type CreateSchedulingPollInput,
} from "@/hooks/api/calendar/scheduling-polls";
import type {
  CreatedSchedulingPoll,
  FinalizedSchedulingPoll,
  ReplacedSchedulingPollGuest,
  SchedulingPoll,
} from "@/hooks/api/calendar/scheduling-polls-schema";
import { CalendarPollGuestReplacement } from "./calendar-poll-guest-replacement";
import { CalendarDateTimePicker } from "./calendar-date-time-picker";

type PollVoter = CreateSchedulingPollInput["voters"][number];
type GuestVoter = NonNullable<SchedulingPoll["guestVoters"]>[number];

function localDateTime(value: Date): string {
  return new Date(value.getTime() - value.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

function displayTime(value: string, timeZone: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(value));
}

export function CalendarSchedulingPollsPanel({
  rule,
  onBack,
}: {
  rule: CalendarBookingRule;
  onBack: () => void;
}) {
  const [cursor, setCursor] = useState<string | null>(null);
  const [previousCursors, setPreviousCursors] = useState<Array<string | null>>(
    [],
  );
  const [selectedPollId, setSelectedPollId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [expiresAt, setExpiresAt] = useState(() =>
    localDateTime(new Date(Date.now() + 86_400_000)),
  );
  const [holdOptions, setHoldOptions] = useState(false);
  const [selectedStarts, setSelectedStarts] = useState<string[]>([]);
  const [voters, setVoters] = useState<PollVoter[]>([]);
  const [guestEmail, setGuestEmail] = useState("");
  const [guestName, setGuestName] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [memberId, setMemberId] = useState("");
  const [created, setCreated] = useState<CreatedSchedulingPoll | null>(null);
  const [finalized, setFinalized] = useState<FinalizedSchedulingPoll | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const requestKeys = useRef(new Map<string, string>());
  const [{ from, to }] = useState(() => ({
    from: new Date().toISOString(),
    to: new Date(Date.now() + 14 * 86_400_000).toISOString(),
  }));
  const polls = useSchedulingPolls(rule.id, cursor);
  const detail = useSchedulingPoll(selectedPollId);
  const preview = useCalendarBookingRulePreview(rule.id, from, to, createOpen);
  const members = useMemberDirectory(
    { kind: "org" },
    {
      search: memberSearch,
      enabled: createOpen,
      selectedIds: voters
        .filter((voter) => voter.kind === "member")
        .map((voter) => voter.userId),
    },
  );
  const create = useCreateSchedulingPoll();
  const finalize = useFinalizeSchedulingPoll();
  const cancel = useCancelSchedulingPoll();

  function addGuest() {
    const email = guestEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return setError("Enter a valid guest email.");
    if (
      voters.some(
        (voter) =>
          voter.kind === "guest" && voter.email.toLowerCase() === email,
      )
    )
      return setError("This guest is already included.");
    if (voters.length >= 100)
      return setError("A poll supports at most 100 voters.");
    setVoters([
      ...voters,
      {
        kind: "guest",
        email,
        name: guestName.trim() || null,
        requirement: "required",
      },
    ]);
    setGuestEmail("");
    setGuestName("");
    setError(null);
  }

  function addMember() {
    const member = members.members.find((item) => item.id === memberId);
    if (!member) return setError("Choose a current organization member.");
    if (
      voters.some(
        (voter) => voter.kind === "member" && voter.userId === member.id,
      )
    )
      return setError("This member is already included.");
    if (voters.length >= 100)
      return setError("A poll supports at most 100 voters.");
    setVoters([
      ...voters,
      { kind: "member", userId: member.id, requirement: "required" },
    ]);
    setMemberId("");
    setError(null);
  }

  async function submit() {
    if (preview.data?.availabilityState !== "available")
      return setError("Available options must load before creating a poll.");
    const options = preview.data.slots
      .filter((slot) => selectedStarts.includes(slot.start))
      .map((slot) => ({ startAt: slot.start, endAt: slot.end }));
    if (options.length < 2 || options.length > 20)
      return setError("Choose between 2 and 20 available times.");
    if (!title.trim()) return setError("Enter a poll title.");
    if (voters.length === 0) return setError("Add at least one voter.");
    const expiry = new Date(expiresAt);
    if (
      !Number.isFinite(expiry.getTime()) ||
      expiry.getTime() < Date.now() + 5 * 60_000 ||
      expiry.getTime() > Date.now() + 30 * 86_400_000
    )
      return setError(
        "Choose an expiry between 5 minutes and 30 days from now.",
      );
    const payload = {
      ruleId: rule.id,
      expectedRuleVersion: rule.version,
      title: title.trim(),
      expiresAt: expiry.toISOString(),
      holdOptions,
      options,
      voters,
    };
    const identity = JSON.stringify(payload);
    let requestId = requestKeys.current.get(identity);
    if (!requestId) {
      requestId = crypto.randomUUID();
      requestKeys.current.set(identity, requestId);
    }
    try {
      const result = await create.mutateAsync({ ...payload, requestId });
      setCreated(result);
      setSelectedPollId(result.poll.id);
      setCreateOpen(false);
      setCursor(null);
      setPreviousCursors([]);
      requestKeys.current.delete(identity);
      setError(null);
      toast.success("Scheduling poll created");
    } catch (cause) {
      setError(getErrorMessage(cause));
    }
  }

  async function finalizeOption(optionId: string) {
    if (!detail.data) return;
    try {
      const result = await finalize.mutateAsync({
        pollId: detail.data.id,
        optionId,
        expectedVersion: detail.data.version,
      });
      setFinalized(result);
      setError(null);
      toast.success(
        result.outcome === "finalized"
          ? "Poll finalized"
          : result.outcome === "pending"
            ? "Finalization is pending"
            : "That option is unavailable",
      );
    } catch (cause) {
      setError(getErrorMessage(cause));
    }
  }

  async function cancelPoll() {
    if (!detail.data) return;
    try {
      await cancel.mutateAsync({
        pollId: detail.data.id,
        expectedVersion: detail.data.version,
      });
      setError(null);
      toast.success("Poll cancelled");
    } catch (cause) {
      setError(getErrorMessage(cause));
    }
  }

  function handleGuestReplaced(result: ReplacedSchedulingPollGuest) {
    setCreated((current) =>
      current && current.poll.id === selectedPollId
        ? {
            ...current,
            voterLinks: current.voterLinks.filter(
              (link) => link.voterId !== result.voterId,
            ),
          }
        : current,
    );
  }

  function renderGuestVoter(guest: GuestVoter) {
    if (!selectedPollId) return null;
    return (
      <CalendarPollGuestReplacement
        key={guest.voterId}
        pollId={selectedPollId}
        guest={guest}
        onReplaced={handleGuestReplaced}
      />
    );
  }

  return (
    <div className="space-y-4">
      <Button variant="outline" onClick={onBack}>
        Back to booking pages
      </Button>
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="font-medium">Scheduling polls</h3>
          <p className="text-sm text-muted-foreground">
            {rule.title} · {rule.timeZone}
          </p>
        </div>
        <Button
          onClick={() => {
            setCreateOpen(true);
            setSelectedPollId(null);
            setCreated(null);
            setFinalized(null);
            setError(null);
          }}
        >
          New poll
        </Button>
      </div>
      {error ? (
        <p
          role="alert"
          className="rounded-md border border-destructive p-2 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}
      {created?.poll.id === selectedPollId && created.voterLinks.length ? (
        <div className="space-y-2 rounded-md border p-3">
          <p className="text-sm font-medium">Guest voting links</p>
          <p className="text-xs text-muted-foreground">
            Copy these links now. Tokens are shown only after creation.
          </p>
          {created.voterLinks.map((link) => {
            const href = `${window.location.origin}/calendar/polls/${encodeURIComponent(link.token)}`;
            return (
              <div key={link.voterId} className="space-y-1">
                <Label htmlFor={`poll-link-${link.voterId}`}>
                  {link.email}
                </Label>
                <Input id={`poll-link-${link.voterId}`} readOnly value={href} />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(href);
                      toast.success("Voting link copied");
                    } catch {
                      toast.error("Could not copy the link");
                    }
                  }}
                >
                  Copy link
                </Button>
              </div>
            );
          })}
        </div>
      ) : null}
      {createOpen ? (
        <div className="space-y-4 rounded-md border p-3">
          <div className="space-y-1">
            <Label htmlFor="poll-title">Title</Label>
            <Input
              id="poll-title"
              maxLength={200}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="poll-expires">Voting closes</Label>
            <CalendarDateTimePicker
              id="poll-expires"
              label="Voting closes"
              value={expiresAt}
              onChange={setExpiresAt}
            />
          </div>
          <Label htmlFor="poll-hold-options" className="flex items-center gap-2 text-sm font-normal">
            <Checkbox
              id="poll-hold-options"
              checked={holdOptions}
              onCheckedChange={(checked) => setHoldOptions(checked === true)}
            />
            Temporarily hold proposed capacity
          </Label>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Proposed times</legend>
            {preview.access.unavailable || preview.isError ? (
              <ErrorState
                title="Available times unavailable"
                error={preview.error}
                onRetry={() => void preview.refetch()}
              />
            ) : preview.access.pending || preview.isPending ? (
              <p role="status">Checking available times…</p>
            ) : preview.data?.availabilityState !== "available" ? (
              <p className="text-sm text-muted-foreground">
                {preview.data?.message ?? "No safe times are available."}
              </p>
            ) : preview.data.slots.length ? (
              <div className="max-h-64 space-y-1 overflow-y-auto">
                {preview.data.slots.map((slot) => (
                  <Label
                    key={slot.start}
                    htmlFor={`poll-slot-${slot.start}`}
                    className="flex items-center gap-2 rounded-md border p-2 text-sm font-normal"
                  >
                    <Checkbox
                      id={`poll-slot-${slot.start}`}
                      checked={selectedStarts.includes(slot.start)}
                      disabled={
                        !selectedStarts.includes(slot.start) &&
                        selectedStarts.length >= 20
                      }
                      onCheckedChange={(checked) =>
                        setSelectedStarts(
                          checked === true
                            ? [...selectedStarts, slot.start]
                            : selectedStarts.filter(
                                (value) => value !== slot.start,
                              ),
                        )
                      }
                    />
                    {displayTime(slot.start, rule.timeZone)}
                  </Label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No available times.
              </p>
            )}
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Voters</legend>
            {voters.map((voter, index) => (
              <div
                key={`${voter.kind}:${voter.kind === "guest" ? voter.email : voter.userId}`}
                className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm"
              >
                <span>
                  {voter.kind === "guest"
                    ? voter.email
                    : (members.selectedMembers.find(
                        (member) => member.id === voter.userId,
                      )?.name ?? voter.userId)}
                </span>
                <Select
                  value={voter.requirement}
                  onValueChange={(value) => {
                    if (value !== "required" && value !== "optional") return;
                    setVoters(
                      voters.map((item, position) =>
                        position === index
                          ? {
                              ...item,
                              requirement: value,
                            }
                          : item,
                      ),
                    );
                  }}
                >
                  <SelectTrigger aria-label={`Voter ${index + 1} priority`} size="sm" className="w-auto">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="required">Required</SelectItem>
                    <SelectItem value="optional">Optional</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setVoters(
                      voters.filter((_, position) => position !== index),
                    )
                  }
                >
                  Remove
                </Button>
              </div>
            ))}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="poll-guest-email">Guest email</Label>
                <Input
                  id="poll-guest-email"
                  type="email"
                  value={guestEmail}
                  onChange={(event) => setGuestEmail(event.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="poll-guest-name">Guest name</Label>
                <Input
                  id="poll-guest-name"
                  value={guestName}
                  onChange={(event) => setGuestName(event.target.value)}
                />
              </div>
            </div>
            <Button variant="outline" onClick={addGuest}>
              Add guest
            </Button>
            <div className="space-y-1">
              <Label htmlFor="poll-member-search">Find a team member</Label>
              <Input
                id="poll-member-search"
                value={memberSearch}
                onChange={(event) => setMemberSearch(event.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Select
                value={memberId}
                onValueChange={setMemberId}
              >
                <SelectTrigger aria-label="Team member" className="min-w-0 flex-1">
                  <SelectValue placeholder="Choose a member" />
                </SelectTrigger>
                <SelectContent>
                  {members.members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name ?? member.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={addMember}
                disabled={members.isLoading}
              >
                Add member
              </Button>
            </div>
          </fieldset>
          <div className="flex gap-2">
            <Button onClick={() => void submit()} disabled={create.isPending}>
              Create poll
            </Button>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : selectedPollId ? (
        <div className="space-y-3 rounded-md border p-3">
          <Button
            variant="outline"
            onClick={() => {
              setSelectedPollId(null);
              setFinalized(null);
            }}
          >
            Back to polls
          </Button>
          {detail.access.unavailable || detail.isError ? (
            <ErrorState
              title="Poll unavailable"
              error={detail.error}
              onRetry={() => void detail.refetch()}
            />
          ) : detail.access.pending || detail.isPending ? (
            <p role="status">Loading poll…</p>
          ) : detail.data ? (
            <>
              <div>
                <h4 className="font-medium">{detail.data.title}</h4>
                <p className="text-sm text-muted-foreground">
                  {detail.data.status} · Voting closes{" "}
                  {displayTime(detail.data.expiresAt, rule.timeZone)}
                </p>
              </div>
              {detail.data.options.map((option) => (
                <div
                  key={option.id}
                  className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm"
                >
                  <span>
                    {displayTime(option.startAt, rule.timeZone)} ·{" "}
                    {option.status}
                  </span>
                  <span>
                    Yes {option.votes.yes} · Maybe {option.votes.maybe} · No{" "}
                    {option.votes.no}
                  </span>
                  {detail.data?.status === "open" &&
                  option.status === "proposed" ? (
                    <ConfirmDialog
                      title="Finalize this option?"
                      description="The poll will close and this time will become the scheduled event."
                      confirmLabel="Finalize"
                      destructive
                      isPending={finalize.isPending}
                      onConfirm={() => void finalizeOption(option.id)}
                      trigger={<Button size="sm" disabled={finalize.isPending}>Finalize</Button>}
                    />
                  ) : null}
                </div>
              ))}
              {detail.data.status === "open" ? (
                <ConfirmDialog
                  title={`Cancel “${detail.data.title}”?`}
                  description="Voters will no longer be able to respond."
                  confirmLabel="Cancel poll"
                  destructive
                  isPending={cancel.isPending}
                  onConfirm={() => void cancelPoll()}
                  trigger={<Button variant="outline" disabled={cancel.isPending}>Cancel poll</Button>}
                />
              ) : null}
              {finalized?.outcome === "unavailable" ? (
                <div className="space-y-2">
                  <p className="text-sm">
                    That option is unavailable. Votes remain visible; choose
                    another current option.
                  </p>
                  {finalized.alternatives.map((alternative) => (
                    <p
                      key={alternative.start}
                      className="text-sm text-muted-foreground"
                    >
                      Alternative:{" "}
                      {displayTime(alternative.start, rule.timeZone)}
                    </p>
                  ))}
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      ) : (
        <>
          {polls.access.unavailable || polls.isError ? (
            <ErrorState
              title="Polls unavailable"
              error={polls.error}
              onRetry={() => void polls.refetch()}
            />
          ) : polls.access.pending || polls.isPending ? (
            <p role="status">Loading polls…</p>
          ) : polls.data?.items.length ? (
            <div className="space-y-2">
              {polls.data.items.map((poll) => (
                <Button
                  key={poll.id}
                  type="button"
                  variant="outline"
                  className="h-auto w-full justify-between p-3 text-left"
                  onClick={() => {
                    setSelectedPollId(poll.id);
                    setFinalized(null);
                  }}
                >
                  {poll.title}
                  <span className="capitalize text-muted-foreground">
                    {poll.status}
                  </span>
                </Button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No polls for this booking page yet.
            </p>
          )}
          <div className="flex gap-2">
            {previousCursors.length ? (
              <Button
                variant="outline"
                onClick={() => {
                  setCursor(previousCursors.at(-1) ?? null);
                  setPreviousCursors(previousCursors.slice(0, -1));
                }}
              >
                Newer
              </Button>
            ) : null}
            {polls.data?.nextCursor ? (
              <Button
                variant="outline"
                onClick={() => {
                  setPreviousCursors([...previousCursors, cursor]);
                  setCursor(polls.data.nextCursor);
                }}
              >
                Older
              </Button>
            ) : null}
          </div>
        </>
      )}
      {selectedPollId &&
      detail.data?.status === "open" &&
      detail.data.guestVoters?.length ? (
        <section
          className="space-y-2 rounded-md border p-3"
          aria-label="Poll guests"
        >
          <h4 className="font-medium">Guest voters</h4>
          <p className="text-xs text-muted-foreground">
            Correcting a guest replaces their signed link and clears that
            guest’s votes.
          </p>
          {detail.data.guestVoters.map(renderGuestVoter)}
        </section>
      ) : null}
    </div>
  );
}
