"use client";

import { useMemo, useState } from "react";
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

export function EventAttendeesPicker({
  members,
  selectedIds,
  onToggle,
}: EventAttendeesPickerProps) {
  const [search, setSearch] = useState("");
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
      {typedIsEmail && candidates.every((c) => !selectedIds.includes(c.id)) && (
        <p className="text-xs text-muted-foreground">
          Only organization members can be invited. External guests are not yet supported.
        </p>
      )}
    </div>
  );
}
