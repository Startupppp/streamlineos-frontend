"use client";

import { useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Check, Search, X, Loader2 } from "lucide-react";
import { cn, resolveImageUrl } from "@/lib/utils";
import { getInitials } from "@/lib/format-utils";

export interface SelectableMember {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  email: string;
  image?: string | null;
}

function memberName(member: SelectableMember): string {
  if (member.firstName)
    return `${member.firstName} ${member.lastName ?? ""}`.trim();
  return member.name ?? member.email;
}

interface ChipProps {
  member: SelectableMember;
  onRemove: (id: string) => void;
}

function MemberChip({ member, onRemove }: ChipProps) {
  const name = memberName(member);
  const handleRemove = useCallback(() => onRemove(member.id), [member.id, onRemove]);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted/50 py-0.5 pl-0.5 pr-2 text-xs">
      <Avatar className="h-5 w-5 shrink-0">
        <AvatarImage src={resolveImageUrl(member.image)} />
        <AvatarFallback className="text-[9px]">{getInitials(name)}</AvatarFallback>
      </Avatar>
      <span className="max-w-[10rem] truncate">{name}</span>
      <button
        type="button"
        onClick={handleRemove}
        className="text-muted-foreground hover:text-destructive transition-colors"
        aria-label={`Remove ${name}`}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

interface RowProps {
  member: SelectableMember;
  selected: boolean;
  onToggle: (id: string) => void;
}

function MemberRow({ member, selected, onToggle }: RowProps) {
  const name = memberName(member);
  const handleClick = useCallback(() => onToggle(member.id), [member.id, onToggle]);
  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={selected}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
        selected ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-muted",
      )}
    >
      <Avatar className="w-7 shrink-0">
        <AvatarImage src={resolveImageUrl(member.image)} />
        <AvatarFallback className="text-[10px]">{getInitials(name)}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className={cn("truncate text-sm", selected && "font-medium")}>{name}</span>
        <span className="truncate text-xs text-muted-foreground">{member.email}</span>
      </div>
      <span
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2",
          selected ? "border-primary bg-primary" : "border-muted-foreground/30",
        )}
      >
        {selected && <Check className="h-2.5 w-2.5 text-white" />}
      </span>
    </button>
  );
}

interface MemberMultiSelectProps {
  results: SelectableMember[];
  selectedMembers: SelectableMember[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  emptyText?: string;
}

export function MemberMultiSelect({
  results,
  selectedMembers,
  selectedIds,
  onToggle,
  search,
  onSearchChange,
  isLoading = false,
  placeholder = "Search people…",
  emptyText = "No people found.",
}: MemberMultiSelectProps) {
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onSearchChange(e.target.value),
    [onSearchChange],
  );

  return (
    <div className="space-y-1.5">
      {selectedMembers.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedMembers.map((member) => (
            <MemberChip key={member.id} member={member} onRemove={onToggle} />
          ))}
        </div>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={handleSearchChange}
          placeholder={placeholder}
          className="pl-8 text-sm"
        />
      </div>

      <div className="max-h-48 space-y-0.5 overflow-y-auto overscroll-contain rounded-lg border bg-muted/30 p-1">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Searching…
          </div>
        ) : results.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">{emptyText}</p>
        ) : (
          results.map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              selected={selectedIds.includes(member.id)}
              onToggle={onToggle}
            />
          ))
        )}
      </div>
    </div>
  );
}
