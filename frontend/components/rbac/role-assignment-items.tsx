"use client";

import { useCallback } from "react";
import { Loader2, Plus, X, Building2 } from "lucide-react";
import { TruncatedText } from "@/components/ui/truncated-text";
import { CommandItem } from "@/components/ui/command";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getInitials } from "@/lib/format-utils";
import type { OrgMember } from "@/types/organization";
import type { AssignableDepartment } from "@/hooks/api/roles";

export interface AssignableUserItemProps {
  member: OrgMember;
  busy: boolean;
  onAdd: (userId: string) => void;
}

export function AssignableUserItem({
  member,
  busy,
  onAdd,
}: AssignableUserItemProps) {
  const handleSelect = useCallback(
    () => onAdd(member.userId),
    [member.userId, onAdd],
  );

  return (
    <CommandItem
      value={`${member.name ?? ""} ${member.email}`}
      onSelect={handleSelect}
      disabled={busy}
      className="gap-2"
      aria-label={`Assign ${member.name ?? member.email}`}
    >
      <Avatar className="h-6 w-6">
        <AvatarImage src={member.image ?? undefined} alt={member.name ?? ""} />
        <AvatarFallback className="text-[9px]">
          {getInitials(member.name ?? member.email)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <TruncatedText text={member.name ?? member.email ?? ""} className="text-[13px]" />
        {member.name && (
          <TruncatedText text={member.email ?? ""} className="text-[11px] text-muted-foreground" />
        )}
      </div>
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
      ) : (
        <Plus
          className="h-3.5 w-3.5 text-muted-foreground"
          aria-hidden="true"
        />
      )}
    </CommandItem>
  );
}

export interface AssignableDepartmentItemProps {
  department: AssignableDepartment;
  busy: boolean;
  onAdd: (departmentId: number) => void;
}

export function AssignableDepartmentItem({
  department,
  busy,
  onAdd,
}: AssignableDepartmentItemProps) {
  const handleSelect = useCallback(
    () => onAdd(department.id),
    [department.id, onAdd],
  );

  return (
    <CommandItem
      value={department.name}
      onSelect={handleSelect}
      disabled={busy}
      className="gap-2"
      aria-label={`Assign department ${department.name}`}
    >
      <Building2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      <TruncatedText text={department.name} className="text-[13px] flex-1" />
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
      ) : (
        <Plus
          className="h-3.5 w-3.5 text-muted-foreground"
          aria-hidden="true"
        />
      )}
    </CommandItem>
  );
}

export interface MemberRowProps {
  name: string | null;
  subtitle: string | null;
  image: string | null;
  principalId: string;
  removing: boolean;
  onRemove: (userId: string) => void;
}

export function MemberRow({
  name,
  subtitle,
  image,
  principalId,
  removing,
  onRemove,
}: MemberRowProps) {
  const handleRemove = useCallback(
    () => onRemove(principalId),
    [principalId, onRemove],
  );

  return (
    <div
      role="listitem"
      className="flex items-center gap-3 rounded-md border border-border/50 px-3 py-2"
    >
      <Avatar className="w-8">
        <AvatarImage src={image ?? undefined} alt={name ?? ""} />
        <AvatarFallback className="text-[10px]">
          {getInitials(name ?? subtitle ?? "?")}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <TruncatedText text={name ?? subtitle ?? "Unknown"} className="text-[13px] font-medium" />
        {subtitle && name && (
          <TruncatedText text={subtitle} className="text-[11px] text-muted-foreground" />
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="w-8 text-muted-foreground hover:text-destructive"
        onClick={handleRemove}
        disabled={removing}
        aria-label={`Remove ${name ?? subtitle ?? "member"} from role`}
      >
        {removing ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <X className="h-3.5 w-3.5" />
        )}
      </Button>
    </div>
  );
}

export interface DepartmentRowProps {
  name: string | null;
  principalId: number;
  removing: boolean;
  onRemove: (departmentId: number) => void;
}

export function DepartmentRow({
  name,
  principalId,
  removing,
  onRemove,
}: DepartmentRowProps) {
  const handleRemove = useCallback(
    () => onRemove(principalId),
    [principalId, onRemove],
  );

  return (
    <div
      role="listitem"
      className="flex items-center gap-3 rounded-md border border-border/50 px-3 py-2"
    >
      <span
        className="flex h-8 w-8 items-center justify-center rounded-full bg-muted shrink-0"
        aria-hidden="true"
      >
        <Building2 className="h-4 w-4 text-muted-foreground" />
      </span>
      <TruncatedText text={name ?? "Department"} className="text-[13px] font-medium flex-1" />
      <Button
        variant="ghost"
        size="icon"
        className="w-8 text-muted-foreground hover:text-destructive"
        onClick={handleRemove}
        disabled={removing}
        aria-label={`Remove ${name ?? "department"} from role`}
      >
        {removing ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <X className="h-3.5 w-3.5" />
        )}
      </Button>
    </div>
  );
}
