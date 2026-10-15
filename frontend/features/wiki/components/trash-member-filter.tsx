"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOrgMembers } from "@/hooks/api/organization";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { getUserDisplayName } from "@/lib/person-display";

interface TrashMemberFilterProps {
  value?: number;
  onChange: (value: string) => void;
}

const ALL_MEMBERS_VALUE = "all";

export function TrashMemberFilter({ value, onChange }: TrashMemberFilterProps) {
  const [search, setSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState<{ id: number; name: string } | null>(null);
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const { data } = useOrgMembers(1, 100, debouncedSearch || undefined);
  const members = data?.data ?? [];
  const selectedInResults = members.find((member) => member.membershipId === value);
  const selectedName = selectedInResults
    ? getUserDisplayName(selectedInResults)
    : selectedMember !== null && selectedMember.id === value
      ? selectedMember.name
      : "Selected member";

  function handleMemberChange(next: string) {
    const member = members.find((candidate) => String(candidate.membershipId) === next);
    if (member) setSelectedMember({ id: member.membershipId, name: getUserDisplayName(member) });
    onChange(next);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Input
        type="search"
        aria-label="Find member"
        placeholder="Find member…"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="w-40"
      />
      <Select
        value={value !== undefined ? String(value) : ALL_MEMBERS_VALUE}
        onValueChange={handleMemberChange}
      >
        <SelectTrigger className="w-52" aria-label="Deleted by member">
          <SelectValue placeholder="All members" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_MEMBERS_VALUE}>All members</SelectItem>
          {value !== undefined && !selectedInResults && (
            <SelectItem value={String(value)}>{selectedName}</SelectItem>
          )}
          {members.map((member) => (
            <SelectItem key={member.membershipId} value={String(member.membershipId)}>
              {getUserDisplayName(member)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
