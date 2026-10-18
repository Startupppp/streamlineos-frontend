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
import { useKbTrashDeleters } from "@/hooks/api/kb/pages";
import { useDebouncedValue } from "@/hooks/common/use-debounce";

interface TrashMemberFilterProps {
  value?: number;
  onChange: (value: string) => void;
}

const ALL_MEMBERS_VALUE = "all";
const MORE_MEMBERS_VALUE = "more";

export function TrashMemberFilter({ value, onChange }: TrashMemberFilterProps) {
  const [search, setSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState<{ id: number; name: string } | null>(null);
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const { data, hasNextPage, fetchNextPage, isFetchingNextPage } = useKbTrashDeleters(debouncedSearch, value);
  const members = data?.pages.flatMap((page) => page.data) ?? [];
  const selectedInResults = members.find((member) => member.membershipId === value);
  const selectedName = selectedInResults
    ? selectedInResults.name
    : selectedMember !== null && selectedMember.id === value
      ? selectedMember.name
      : data?.pages[0]?.selected?.name ?? "Selected member";

  function handleMemberChange(next: string) {
    if (next === MORE_MEMBERS_VALUE) {
      void fetchNextPage();
      return;
    }
    const member = members.find((candidate) => String(candidate.membershipId) === next);
    if (member) setSelectedMember({ id: member.membershipId, name: member.name });
    onChange(next);
  }

  return (
    <div className="flex flex-nowrap items-center gap-2">
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
              {member.name}
            </SelectItem>
          ))}
          {hasNextPage && (
            <SelectItem value={MORE_MEMBERS_VALUE} disabled={isFetchingNextPage}>
              {isFetchingNextPage ? "Loading…" : "Load more members"}
            </SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
