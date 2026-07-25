"use client";

import { useMemo, useState } from "react";
import { Check, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
import { useProjectWorkspaceMembers } from "@/hooks/api/projects/workspace-members";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import {
  getUserDisplayName,
  getUserInitials,
} from "@/features/projects/shared/resolve-user-name";
import { cn, resolveImageUrl } from "@/lib/utils";

interface WorkspaceMemberPickerProps {
  value: string | undefined;
  onChange: (id: string | undefined) => void;
  excludeUserIds?: string[];
}

export function WorkspaceMemberPicker({
  value,
  onChange,
  excludeUserIds = [],
}: WorkspaceMemberPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data } = useProjectWorkspaceMembers(
    { limit: 200, search: debouncedSearch || undefined },
    { staleTime: 30_000 },
  );

  const members = useMemo(
    () => (data?.data ?? []).filter((m) => !excludeUserIds.includes(m.id)),
    [data?.data, excludeUserIds],
  );

  const selected = useMemo(
    () => (value ? members.find((m) => m.id === value) : undefined),
    [value, members],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        getUserDisplayName(m).toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q),
    );
  }, [members, search]);

  function handleSelect(userId: string) {
    onChange(userId === value ? undefined : userId);
    setOpen(false);
    setSearch("");
  }

  function handleSearchChange(v: string) {
    setSearch(v);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          size="sm"
          className={cn(
            "h-8 min-w-[180px] justify-start gap-1.5 text-xs font-normal",
            !selected && "text-muted-foreground",
          )}
        >
          {selected ? (
            <>
              <Avatar className="h-4 w-4 shrink-0">
                <AvatarImage src={resolveImageUrl(selected.image)} />
                <AvatarFallback className="text-[7px]">
                  {getUserInitials(selected)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{getUserDisplayName(selected)}</span>
            </>
          ) : (
            <>
              <User className="h-3.5 w-3.5 shrink-0" />
              <span>Add a member…</span>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search members…"
            className="text-xs"
            value={search}
            onValueChange={handleSearchChange}
          />
          <CommandList className="max-h-52 overflow-y-auto scrollbar-hide">
            <CommandEmpty className="py-2 text-center text-xs text-muted-foreground">
              No workspace members found.
            </CommandEmpty>
            <CommandGroup>
              {filtered.map((m) => (
                <CommandItem
                  key={m.id}
                  value={m.id}
                  onSelect={handleSelect}
                  className="gap-2"
                >
                  <Avatar className="h-5 w-5 shrink-0">
                    <AvatarImage src={resolveImageUrl(m.image)} />
                    <AvatarFallback className="text-[7px]">
                      {getUserInitials(m)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate text-xs">{getUserDisplayName(m)}</span>
                  {m.id === value && <Check className="ml-auto h-3 w-3" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
