"use client";

import { useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  MemberMultiSelect,
  type SelectableMember,
} from "@/components/members/member-multi-select";
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

export function EventAttendeesPicker({
  members,
  selectedIds,
  onToggle,
}: EventAttendeesPickerProps) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const hasSearch = debouncedSearch.trim().length > 0;

  const { data: searchResults = [], isFetching } = useCalendarMemberLookup({
    search: debouncedSearch,
    enabled: hasSearch,
  });

  const knownById = useMemo(() => {
    const map = new Map<string, SelectableMember>();
    for (const m of members) map.set(m.id, m);
    for (const m of searchResults) map.set(m.id, m);
    return map;
  }, [members, searchResults]);

  const selectedMembers = useMemo(
    () =>
      selectedIds
        .map((id) => knownById.get(id))
        .filter((m): m is SelectableMember => m !== undefined),
    [selectedIds, knownById],
  );

  const results: SelectableMember[] = hasSearch ? searchResults : members;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium">Attendees</Label>
        {selectedIds.length > 0 && (
          <Badge variant="secondary" className="text-dense">
            {selectedIds.length} selected
          </Badge>
        )}
      </div>
      <MemberMultiSelect
        results={results}
        selectedMembers={selectedMembers}
        selectedIds={selectedIds}
        onToggle={onToggle}
        search={search}
        onSearchChange={setSearch}
        isLoading={hasSearch && isFetching}
      />
    </div>
  );
}
