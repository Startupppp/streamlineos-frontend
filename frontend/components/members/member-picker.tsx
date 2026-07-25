"use client";

import { useState, useMemo, useCallback } from "react";
import { Check, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn, resolveImageUrl } from "@/lib/utils";
import { FIELD_CONTROL_CLASS } from "@/components/ui/field-control";
import { useOrgMembers, useOrgMembersByIds } from "@/hooks/api/organization";
import { useProjectMembers } from "@/hooks/api/projects/projects";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import {
  getUserDisplayName,
  getUserInitials,
  type NamedUser,
} from "@/features/projects/shared/resolve-user-name";
import { TruncatedText } from "@/components/ui/truncated-text";

interface MemberOption extends NamedUser {
  id: string;
  email: string;
  image: string | null;
}

interface MemberPickerBaseProps {
  projectId?: number;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  excludeUserId?: string;
}

interface MemberPickerSingleProps extends MemberPickerBaseProps {
  mode?: "single";
  value?: string;
  onChange?: (userId: string | null) => void;
  allowUnassigned?: boolean;
  values?: never;
  onToggle?: never;
}

interface MemberPickerMultiProps extends MemberPickerBaseProps {
  mode: "multi";
  values?: string[];
  onToggle?: (userId: string) => void;
  value?: never;
  onChange?: never;
  allowUnassigned?: never;
}

export type MemberPickerProps = MemberPickerSingleProps | MemberPickerMultiProps;

function useMemberOptions(
  projectId: number | undefined,
  search: string,
  selectedIds: string[],
): { options: MemberOption[]; selectedMembers: MemberOption[] } {
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const { data: orgData } = useOrgMembers(1, 50, debouncedSearch || undefined, {
    enabled: projectId === undefined,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
  const { data: projectMembers = [] } = useProjectMembers(projectId ?? 0);

  const orgOptions = useMemo(
    () =>
      (orgData?.data ?? []).map((m) => ({
        id: m.userId,
        name: m.name,
        firstName: null,
        lastName: null,
        email: m.email,
        image: m.image,
      })),
    [orgData?.data],
  );

  const missingIds = useMemo(
    () =>
      projectId === undefined
        ? selectedIds.filter((id) => !orgOptions.some((m) => m.id === id))
        : [],
    [projectId, selectedIds, orgOptions],
  );
  const { data: selectedData } = useOrgMembersByIds(missingIds);

  return useMemo(() => {
    if (projectId !== undefined) {
      const options = projectMembers.map((m) => ({
        id: m.id,
        name: m.name,
        firstName: m.firstName,
        lastName: m.lastName,
        email: m.email,
        image: m.image,
      }));
      return {
        options,
        selectedMembers: options.filter((m) => selectedIds.includes(m.id)),
      };
    }
    const resolved = (selectedData?.data ?? []).map((m) => ({
      id: m.userId,
      name: m.name,
      firstName: null,
      lastName: null,
      email: m.email,
      image: m.image,
    }));
    const byId = new Map<string, MemberOption>();
    for (const m of [...orgOptions, ...resolved]) byId.set(m.id, m);
    return {
      options: orgOptions,
      selectedMembers: selectedIds
        .map((id) => byId.get(id))
        .filter((m): m is MemberOption => m !== undefined),
    };
  }, [projectId, projectMembers, orgOptions, selectedData?.data, selectedIds]);
}

function filterMembers(
  members: MemberOption[],
  search: string,
  serverFiltered: boolean,
  excludeUserId?: string,
) {
  const eligible = excludeUserId
    ? members.filter((m) => m.id !== excludeUserId)
    : members;
  if (serverFiltered || !search.trim()) return eligible;
  const q = search.toLowerCase();
  return eligible.filter(
    (m) =>
      getUserDisplayName(m).toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q),
  );
}

const TRIGGER_CLASS = cn(
  FIELD_CONTROL_CLASS,
  "w-full justify-start gap-2 px-3 font-medium",
);

function MemberAvatar({ member, className }: { member: MemberOption; className?: string }) {
  return (
    <Avatar className={cn("h-5 w-5 shrink-0", className)}>
      <AvatarImage src={resolveImageUrl(member.image)} />
      <AvatarFallback className="text-[7px]">{getUserInitials(member)}</AvatarFallback>
    </Avatar>
  );
}

export function MemberPicker(props: MemberPickerProps) {
  const {
    projectId,
    placeholder = "Select member…",
    disabled,
    className,
    excludeUserId,
  } = props;
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const multiValues = props.mode === "multi" ? props.values : undefined;
  const singleValue = props.mode === "multi" ? undefined : props.value;
  const selectedIds = useMemo(
    () => multiValues ?? (singleValue ? [singleValue] : []),
    [multiValues, singleValue],
  );
  const { options: members, selectedMembers } = useMemberOptions(
    projectId,
    search,
    selectedIds,
  );
  const serverFiltered = projectId === undefined;
  const filtered = useMemo(
    () => filterMembers(members, search, serverFiltered, excludeUserId),
    [members, search, serverFiltered, excludeUserId],
  );

  const handleSearchChange = useCallback((v: string) => {
    setSearch(v);
  }, []);

  if (props.mode === "multi") {
    const { values = [], onToggle } = props;

    function handleToggle(userId: string) {
      onToggle?.(userId);
    }

    return (
      <div className={cn("space-y-1.5", className)}>
        {selectedMembers.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {selectedMembers.map((m) => (
              <Badge key={m.id} variant="secondary" className="gap-1.5 pl-0.5 pr-1.5 py-0.5">
                <MemberAvatar member={m} className="h-4 w-4" />
                <TruncatedText text={getUserDisplayName(m)} className="text-[11px] max-w-[120px]" />
                <button
                  type="button"
                  className="text-muted-foreground/70 hover:text-destructive transition-colors leading-none"
                  onClick={() => handleToggle(m.id)}
                  aria-label={`Remove ${getUserDisplayName(m)}`}
                >
                  <span className="text-xs font-bold">&times;</span>
                </button>
              </Badge>
            ))}
          </div>
        )}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              disabled={disabled}
              className={cn(TRIGGER_CLASS, "text-muted-foreground font-normal")}
            >
              <User className="h-3.5 w-3.5 shrink-0" />
              <span>{placeholder}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-0" align="start">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Search members…"
                className="text-xs"
                value={search}
                onValueChange={handleSearchChange}
              />
              <CommandList className="max-h-52 overflow-y-auto scrollbar-hide">
                <CommandEmpty className="py-2 text-center text-xs text-muted-foreground">
                  No members found.
                </CommandEmpty>
                <CommandGroup>
                  {filtered.map((m) => (
                    <CommandItem key={m.id} value={m.id} onSelect={() => handleToggle(m.id)}>
                      <MemberAvatar member={m} className="mr-2" />
                      <TruncatedText text={getUserDisplayName(m)} className="text-xs" />
                      {values.includes(m.id) && <Check className="ml-auto h-3 w-3" />}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  const { value, onChange, allowUnassigned } = props;
  const selected = value
    ? (selectedMembers.find((m) => m.id === value) ?? members.find((m) => m.id === value) ?? null)
    : null;

  function handleSelect(userId: string | null) {
    onChange?.(userId);
    setOpen(false);
    setSearch("");
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          disabled={disabled}
          className={cn(
            TRIGGER_CLASS,
            "font-normal",
            !selected && "text-muted-foreground",
            className,
          )}
        >
          {selected ? (
            <>
              <MemberAvatar member={selected} />
              <TruncatedText text={getUserDisplayName(selected)} />
            </>
          ) : (
            <>
              <User className="h-3.5 w-3.5 shrink-0" />
              <span>{placeholder}</span>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search members…"
            className="text-xs"
            value={search}
            onValueChange={handleSearchChange}
          />
          <CommandList className="max-h-52 overflow-y-auto scrollbar-hide">
            <CommandEmpty className="py-2 text-center text-xs text-muted-foreground">
              No members found.
            </CommandEmpty>
            <CommandGroup>
              {allowUnassigned && (
                <CommandItem value="__unassigned__" onSelect={() => handleSelect(null)}>
                  <User className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="text-xs">Unassigned</span>
                  {!value && <Check className="ml-auto h-3 w-3" />}
                </CommandItem>
              )}
              {filtered.map((m) => (
                <CommandItem key={m.id} value={m.id} onSelect={() => handleSelect(m.id)}>
                  <MemberAvatar member={m} className="mr-2" />
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
