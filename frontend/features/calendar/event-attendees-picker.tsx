"use client";

import { memo, useCallback, useMemo, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { XIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MemberPicker } from "@/components/members/member-picker";
import type { MemberOption } from "@/components/members/member-picker-options";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import {
  useCalendarMemberLookup,
  type CalendarOrgMember,
} from "@/hooks/api/calendar";

type PickerMember = Pick<
  CalendarOrgMember,
  "id" | "firstName" | "lastName" | "name" | "email" | "image"
>;

interface EventAttendeesPickerProps {
  members: PickerMember[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  guestEmails: string[];
  onAddGuest: (email: string) => void;
  onRemoveGuest: (email: string) => void;
}

function toOption(member: PickerMember): MemberOption {
  return {
    id: member.id,
    email: member.email,
    image: member.image,
    name: member.name,
    firstName: member.firstName,
    lastName: member.lastName,
  };
}

function matchesQuery(member: PickerMember, query: string): boolean {
  const name = `${member.name ?? ""} ${member.firstName ?? ""} ${member.lastName ?? ""}`;
  return name.toLowerCase().includes(query) || member.email.toLowerCase().includes(query);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface GuestChipProps {
  email: string;
  onRemove: (email: string) => void;
}

const GuestChip = memo(function GuestChip({ email, onRemove }: GuestChipProps) {
  const handleRemove = useCallback(() => onRemove(email), [email, onRemove]);
  return (
    <li>
      <Badge variant="secondary" className="gap-1 pr-0.5">
        {email}
        <AnimatedIconButton
          icon={XIcon}
          iconSize={12}
          type="button"
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          aria-label={`Remove guest ${email}`}
          onClick={handleRemove}
        />
      </Badge>
    </li>
  );
});

export function EventAttendeesPicker({
  members,
  selectedIds,
  onToggle,
  guestEmails,
  onAddGuest,
  onRemoveGuest,
}: EventAttendeesPickerProps) {
  const [search, setSearch] = useState("");
  const [guestDraft, setGuestDraft] = useState("");
  const guestDraftValue = guestDraft.trim().toLowerCase();
  const guestDraftValid = EMAIL_RE.test(guestDraftValue);
  const debouncedSearch = useDebouncedValue(search, 300);
  const query = debouncedSearch.trim().toLowerCase();
  const typed = search.trim().toLowerCase();
  const typedIsEmail = EMAIL_RE.test(search.trim());

  const { data: searchResults = [] } = useCalendarMemberLookup({
    search: debouncedSearch.trim(),
    enabled: query.length > 0,
  });

  const knownById = useMemo(() => {
    const map = new Map<string, MemberOption>();
    for (const member of members) map.set(member.id, toOption(member));
    for (const member of searchResults) map.set(member.id, toOption(member));
    return map;
  }, [members, searchResults]);

  const candidates = useMemo(() => {
    const map = new Map<string, MemberOption>();
    const roster = typed ? members.filter((member) => matchesQuery(member, typed)) : members;
    for (const member of roster) map.set(member.id, toOption(member));
    if (typed && query === typed) {
      for (const member of searchResults) {
        if (matchesQuery(member, typed)) map.set(member.id, toOption(member));
      }
    }
    for (const id of selectedIds) {
      const known = knownById.get(id);
      if (known && !map.has(id)) map.set(id, known);
    }
    return [...map.values()];
  }, [members, typed, query, searchResults, selectedIds, knownById]);

  const typedMatchesMember = candidates.some((c) => c.email.toLowerCase() === typed);
  const canInviteTyped = typedIsEmail && !typedMatchesMember && !guestEmails.includes(typed);

  const handleGuestDraftChange = useCallback((event: ChangeEvent<HTMLInputElement>) => setGuestDraft(event.target.value), []);
  const handleAddGuestDraft = useCallback(() => {
    if (!guestDraftValid || guestEmails.includes(guestDraftValue)) return;
    onAddGuest(guestDraftValue);
    setGuestDraft("");
  }, [guestDraftValid, guestDraftValue, guestEmails, onAddGuest]);
  const handleGuestDraftKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    handleAddGuestDraft();
  }, [handleAddGuestDraft]);
  const handleInviteTyped = useCallback(() => onAddGuest(typed), [onAddGuest, typed]);

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">Attendees</Label>
      <MemberPicker
        mode="multi"
        candidates={candidates}
        values={selectedIds}
        onToggle={onToggle}
        onSearchChange={setSearch}
        placeholder="Add attendees"
        searchLabel="Search attendees"
      />
      {canInviteTyped ? (
        <Button type="button" variant="outline" size="sm" onClick={handleInviteTyped}>
          Invite {typed} as a guest
        </Button>
      ) : null}
      <div className="flex items-center gap-2">
        <Input
          value={guestDraft}
          onChange={handleGuestDraftChange}
          onKeyDown={handleGuestDraftKeyDown}
          placeholder="Invite a guest by email"
          aria-label="Guest email"
          aria-invalid={guestDraft.trim() !== "" && !guestDraftValid}
          type="email"
          maxLength={320}
          className="h-9 flex-1 text-sm"
        />
        <Button type="button" variant="outline" size="sm" disabled={!guestDraftValid} onClick={handleAddGuestDraft}>
          Add guest
        </Button>
      </div>
      {guestEmails.length > 0 ? (
        <ul aria-label="External guests" className="flex flex-wrap gap-1.5">
          {guestEmails.map((email) => (
            <GuestChip key={email} email={email} onRemove={onRemoveGuest} />
          ))}
        </ul>
      ) : null}
    </div>
  );
}
