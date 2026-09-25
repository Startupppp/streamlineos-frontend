"use client";

import { useState, useMemo, useCallback, type ReactNode } from "react";
import { Check, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
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
import { getUserDisplayName, getUserInitials } from "@/lib/person-display";
import { TruncatedText } from "@/components/ui/truncated-text";
import { filterMembers, useMemberOptions, type MemberOption } from "./member-picker-options";

interface MemberPickerBaseProps {
  /**
   * An explicit candidate list, when the caller already knows who is eligible.
   * Used by the declaration-driven action form: the seam resolves an input's
   * option source and hands the result here, so this picker never has to learn
   * which module produced it.
   */
  candidates?: MemberOption[];
  /**
   * Server search: with `candidates`, the caller fetches by the search text
   * itself (debounced) and the picker stops filtering client-side. Without it a
   * capped server list would be filtered down to a subset of a subset.
   */
  onSearchChange?: (search: string) => void;
  /** Lets a caller fetch candidates only while the list is open. */
  onOpenChange?: (open: boolean) => void;
  /**
   * Members that may be selected but are no longer in `candidates` (a server
   * search moved on). Used only to label the selection, never listed.
   */
  knownMembers?: MemberOption[];
  /**
   * Set by `FormControl` so the field's `<FormLabel>` names the trigger; with an
   * id the placeholder stops being the accessible name.
   */
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false";
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
    onSearchChange,
    onOpenChange,
    knownMembers,
    id,
    "aria-describedby": ariaDescribedBy,
    "aria-invalid": ariaInvalid,
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
  const directoryEnabled = enabled && (open || selectedIds.length > 0);
  const { options: members, selectedMembers } = useMemberOptions(
    candidates,
    projectId,
    moduleKey,
    excludeAssigned,
    directoryEnabled,
    search,
    selectedIds,
  );
  const serverFiltered = (candidates === undefined && projectId === undefined) || onSearchChange !== undefined;
  const filtered = useMemo(
    () => filterMembers(members, search, serverFiltered, excludeUserId, excludeUserIds),
    [members, search, serverFiltered, excludeUserId, excludeUserIds],
  );

  const handleSearchChange = useCallback((v: string) => {
    setSearch(v);
    onSearchChange?.(v);
  }, [onSearchChange]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    onOpenChange?.(next);
  }

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
        id={id}
        aria-label={id ? undefined : placeholder}
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid}
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
                  className="text-muted-foreground hover:text-destructive transition-colors leading-none"
                  onClick={() => handleToggle(m.id)}
                  aria-label={`Remove ${getUserDisplayName(m)}`}
                >
                  <span className="text-xs font-bold">&times;</span>
                </button>
              </Badge>
            ))}
          </div>
        ) : null}
        <Popover open={open} onOpenChange={handleOpenChange}>
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
              {filtered.length === 0 ? (
                <div role="status" aria-live="polite" className="py-2 text-center text-xs text-muted-foreground">
                  No members found.
                </div>
              ) : (
                <CommandList className="max-h-52 overflow-y-auto scrollbar-hide">
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
              )}
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  const { value, onChange, allowUnassigned } = props;
  const selected = value
    ? (selectedMembers.find((m) => m.id === value) ??
        members.find((m) => m.id === value) ??
        knownMembers?.find((m) => m.id === value) ??
        null)
    : null;

  function handleSelect(userId: string | null) {
    onChange?.(userId);
    handleOpenChange(false);
    handleSearchChange("");
  }

  const singleTrigger = trigger ?? (
    <Button
      type="button"
      variant="outline"
      role="combobox"
      id={id}
      aria-label={id ? undefined : placeholder}
      aria-describedby={ariaDescribedBy}
      aria-invalid={ariaInvalid}
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
    <Popover open={open} onOpenChange={handleOpenChange}>
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
          {filtered.length === 0 && !allowUnassigned ? (
            <div role="status" aria-live="polite" className="py-2 text-center text-xs text-muted-foreground">
              No members found.
            </div>
          ) : (
            <CommandList className="max-h-52 overflow-y-auto scrollbar-hide">
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
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-xs">{getUserDisplayName(m)}</span>
                      {m.description ? (
                        <span className="truncate text-micro text-muted-foreground">{m.description}</span>
                      ) : null}
                    </span>
                    {m.id === value && <Check className="ml-auto h-3 w-3" />}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
