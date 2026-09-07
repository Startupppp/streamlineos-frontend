"use client";

import { useState, useMemo, useCallback, type ReactNode } from "react";
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
import {
  COMPACT_SEARCH_POPOVER_CONTENT_CLASS,
  FIELD_CONTROL_CLASS,
  FIELD_SEARCH_POPOVER_CONTENT_CLASS,
} from "@/components/ui/field-control";
import { useOrgMembers, useOrgMembersByIds } from "@/hooks/api/organization";
import { useProjectMembers } from "@/hooks/api/build/projects";
import { useProjectWorkspaceMembers } from "@/hooks/api/build/workspace-members";
import { useModuleMemberCandidates } from "@/hooks/api/module-access";
import { useCan } from "@/hooks/api/access";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import {
  getUserDisplayName,
  getUserInitials,
  type NamedUser,
} from "@/lib/person-display";
import { TruncatedText } from "@/components/ui/truncated-text";

interface MemberOption extends NamedUser {
  id: string;
  email: string;
  image: string | null;
}

interface MemberPickerBaseProps {
  /**
   * An explicit candidate list, when the caller already knows who is eligible.
   * Used by the declaration-driven action form: the seam resolves an input's
   * option source and hands the result here, so this picker never has to learn
   * which module produced it.
   */
  candidates?: MemberOption[];
  projectId?: number;
  /** Scopes candidates to a module's member-access candidates instead of org/project members. */
  moduleKey?: string;
  /** Module mode only: exclude users already assigned to the module. Defaults to true. */
  excludeAssigned?: boolean;
  /** Gates candidate fetching, e.g. only while a parent dialog/sheet is open. Defaults to true. */
  enabled?: boolean;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  excludeUserId?: string;
  excludeUserIds?: string[];
  trigger?: ReactNode;
  contentAlign?: "start" | "center" | "end";
  contentClassName?: string;
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
  candidates: MemberOption[] | undefined,
  projectId: number | undefined,
  moduleKey: string | undefined,
  excludeAssigned: boolean,
  enabled: boolean,
  search: string,
  selectedIds: string[],
): { options: MemberOption[]; selectedMembers: MemberOption[] } {
  const explicit = candidates !== undefined;
  const canViewOrgMembers = useCan("settings:view");
  const canViewProjectWorkspaceMembers = useCan("build:members:view");
  const useOrgDirectory =
    !explicit && projectId === undefined && moduleKey === undefined && canViewOrgMembers;
  const useWorkspaceDirectory =
    !explicit &&
    projectId === undefined &&
    moduleKey === undefined &&
    !canViewOrgMembers &&
    canViewProjectWorkspaceMembers;
  const useModuleDirectory = !explicit && moduleKey !== undefined && enabled;

  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const { data: orgData } = useOrgMembers(1, 50, debouncedSearch || undefined, {
    enabled: useOrgDirectory,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
  const { data: workspaceData } = useProjectWorkspaceMembers(
    { limit: 200, search: debouncedSearch || undefined },
    {
      enabled: useWorkspaceDirectory,
      staleTime: 30_000,
      placeholderData: (prev) => prev,
    },
  );
  const { data: projectMembers = [] } = useProjectMembers(projectId ?? 0);
  const { data: moduleData } = useModuleMemberCandidates(
    moduleKey ?? "",
    50,
    debouncedSearch,
    { enabled: useModuleDirectory, userId: selectedIds[0], excludeAssigned },
  );
  const moduleOptions = useMemo(
    () =>
      (moduleData?.data ?? []).map((c) => ({
        id: c.userId,
        name: c.displayName,
        firstName: null,
        lastName: null,
        email: c.email,
        image: c.avatarUrl ?? null,
      })),
    [moduleData?.data],
  );

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

  const workspaceOptions = useMemo(
    () =>
      (workspaceData?.data ?? []).map((m) => ({
        id: m.id,
        name: m.name,
        firstName: m.firstName,
        lastName: m.lastName,
        email: m.email,
        image: m.image,
      })),
    [workspaceData?.data],
  );

  const missingIds = useMemo(
    () =>
      useOrgDirectory
        ? selectedIds.filter((id) => !orgOptions.some((m) => m.id === id))
        : [],
    [useOrgDirectory, selectedIds, orgOptions],
  );
  const { data: selectedData } = useOrgMembersByIds(missingIds);

  return useMemo(() => {
    if (candidates !== undefined) {
      return {
        options: candidates,
        selectedMembers: candidates.filter((m) => selectedIds.includes(m.id)),
      };
    }
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
    if (useOrgDirectory) {
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
    }
    if (useModuleDirectory) {
      return {
        options: moduleOptions,
        selectedMembers: moduleOptions.filter((m) => selectedIds.includes(m.id)),
      };
    }
    return {
      options: workspaceOptions,
      selectedMembers: workspaceOptions.filter((m) => selectedIds.includes(m.id)),
    };
  }, [
    projectId,
    useOrgDirectory,
    useModuleDirectory,
    projectMembers,
    orgOptions,
    moduleOptions,
    workspaceOptions,
    selectedData?.data,
    selectedIds,
  ]);
}

function filterMembers(
  members: MemberOption[],
  search: string,
  serverFiltered: boolean,
  excludeUserId?: string,
  excludeUserIds?: string[],
) {
  const excludeSet = new Set<string>(excludeUserIds ?? []);
  if (excludeUserId) excludeSet.add(excludeUserId);
  const eligible = excludeSet.size > 0
    ? members.filter((m) => !excludeSet.has(m.id))
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
  "w-full justify-start gap-2 px-3 text-left font-medium",
);

function MemberAvatar({ member, className }: { member: MemberOption; className?: string }) {
  return (
    <Avatar className={cn("h-5 w-5 shrink-0", className)}>
      <AvatarImage src={resolveImageUrl(member.image)} />
      <AvatarFallback className="text-micro">{getUserInitials(member)}</AvatarFallback>
    </Avatar>
  );
}

export function MemberPicker(props: MemberPickerProps) {
  const {
    candidates,
    projectId,
    moduleKey,
    excludeAssigned = true,
    enabled = true,
    placeholder = "Select member…",
    disabled,
    className,
    excludeUserId,
    excludeUserIds,
    trigger,
    contentAlign = "start",
    contentClassName,
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
    candidates,
    projectId,
    moduleKey,
    excludeAssigned,
    enabled,
    search,
    selectedIds,
  );
  const serverFiltered = candidates === undefined && projectId === undefined;
  const filtered = useMemo(
    () => filterMembers(members, search, serverFiltered, excludeUserId, excludeUserIds),
    [members, search, serverFiltered, excludeUserId, excludeUserIds],
  );

  const handleSearchChange = useCallback((v: string) => {
    setSearch(v);
  }, []);

  const popoverContentClass = cn(
    trigger ? COMPACT_SEARCH_POPOVER_CONTENT_CLASS : FIELD_SEARCH_POPOVER_CONTENT_CLASS,
    "p-0",
    contentClassName,
  );

  if (props.mode === "multi") {
    const { values = [], onToggle } = props;

    function handleToggle(userId: string) {
      onToggle?.(userId);
    }

    const multiTrigger = trigger ?? (
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
    );

    return (
      <div className={cn(!trigger && "space-y-1.5", className)}>
        {!trigger && selectedMembers.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {selectedMembers.map((m) => (
              <Badge key={m.id} variant="secondary" className="gap-1.5 pl-0.5 pr-1.5 py-0.5">
                <MemberAvatar member={m} className="h-4 w-4" />
                <TruncatedText text={getUserDisplayName(m)} className="text-dense max-w-[120px]" />
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
        ) : null}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            {multiTrigger}
          </PopoverTrigger>
          <PopoverContent className={popoverContentClass} align={contentAlign}>
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

  const singleTrigger = trigger ?? (
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
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {singleTrigger}
      </PopoverTrigger>
      <PopoverContent className={popoverContentClass} align={contentAlign}>
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
