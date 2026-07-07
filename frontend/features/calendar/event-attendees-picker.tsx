"use client";

import { useCallback, useMemo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CheckIcon } from "@animateicons/react/lucide";
import { Plus, X, Loader2 } from "lucide-react";
import { cn, resolveImageUrl } from "@/lib/utils";
import { getInitials } from "@/lib/format-utils";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import {
  useCalendarMemberSearch,
  type CalendarOrgMember,
} from "@/hooks/api/calendar";

type PickerMember = Pick<
  CalendarOrgMember,
  "id" | "firstName" | "lastName" | "name" | "email" | "image"
>;

function getMemberName(
  member: Pick<PickerMember, "firstName" | "lastName" | "name">,
): string {
  if (member.firstName)
    return `${member.firstName} ${member.lastName ?? ""}`.trim();
  return member.name ?? "Unknown";
}

interface SelectedChipProps {
  member: PickerMember;
  onRemove: (id: string) => void;
}

function SelectedChip({ member, onRemove }: SelectedChipProps) {
  const name = getMemberName(member);
  const handleRemove = useCallback(() => {
    onRemove(member.id);
  }, [member.id, onRemove]);

  return (
    <Badge variant="user" className="gap-1.5 py-0.5 pl-0.5 pr-1.5">
      <Avatar className="h-5 w-5 shrink-0">
        <AvatarImage src={resolveImageUrl(member.image)} />
        <AvatarFallback className="text-[9px]">
          {getInitials(name)}
        </AvatarFallback>
      </Avatar>
      <span className="max-w-[10rem] truncate">{name}</span>
      <button
        type="button"
        onClick={handleRemove}
        className="text-accent/70 hover:text-destructive transition-colors"
        aria-label={`Remove ${name}`}
      >
        <X className="h-3 w-3" />
      </button>
    </Badge>
  );
}

interface ResultRowProps {
  member: PickerMember;
  selected: boolean;
  onToggle: (id: string) => void;
}

function ResultRow({ member, selected, onToggle }: ResultRowProps) {
  const name = getMemberName(member);
  const handleSelect = useCallback(() => {
    onToggle(member.id);
  }, [member.id, onToggle]);

  return (
    <CommandItem
      value={`${member.id} ${name} ${member.email}`}
      onSelect={handleSelect}
      className="gap-2"
    >
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarImage src={resolveImageUrl(member.image)} />
        <AvatarFallback className="text-[10px]">
          {getInitials(name)}
        </AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-sm">{name}</span>
        <span className="truncate text-xs text-muted-foreground">
          {member.email}
        </span>
      </div>
      <div
        className={cn(
          "ml-auto flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2",
          selected ? "border-blue-500 bg-blue-500" : "border-muted-foreground/30",
        )}
      >
        {selected && <CheckIcon size={10} className="text-white" />}
      </div>
    </CommandItem>
  );
}

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
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data: searchResults = [], isFetching } = useCalendarMemberSearch(
    debouncedSearch,
    open,
  );

  const knownById = useMemo(() => {
    const map = new Map<string, PickerMember>();
    for (const m of members) map.set(m.id, m);
    for (const m of searchResults) map.set(m.id, m);
    return map;
  }, [members, searchResults]);

  const selectedMembers = useMemo(
    () =>
      selectedIds
        .map((id) => knownById.get(id))
        .filter((m): m is PickerMember => m !== undefined),
    [selectedIds, knownById],
  );

  const results = useMemo(
    () => (debouncedSearch.trim() ? searchResults : members),
    [debouncedSearch, searchResults, members],
  );

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    if (!next) setSearch("");
  }, []);

  const showLoading = isFetching && debouncedSearch.trim().length > 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium">Attendees</Label>
        {selectedIds.length > 0 && (
          <Badge variant="secondary" className="text-[11px]">
            {selectedIds.length} selected
          </Badge>
        )}
      </div>

      {selectedMembers.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedMembers.map((member) => (
            <SelectedChip key={member.id} member={member} onRemove={onToggle} />
          ))}
        </div>
      )}

      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center gap-1.5 rounded-lg border border-dashed px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-blue-400 hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
            Add attendee
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
          side="bottom"
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search people…"
              value={search}
              onValueChange={setSearch}
            />
            <CommandList className="max-h-56 overflow-y-auto overscroll-contain">
              {showLoading ? (
                <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Searching…
                </div>
              ) : (
                <CommandEmpty>No people found.</CommandEmpty>
              )}
              {!showLoading && results.length > 0 && (
                <CommandGroup>
                  {results.map((member) => (
                    <ResultRow
                      key={member.id}
                      member={member}
                      selected={selectedIds.includes(member.id)}
                      onToggle={onToggle}
                    />
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
