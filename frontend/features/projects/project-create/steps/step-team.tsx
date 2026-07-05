"use client";

import { useState } from "react";
import { Search, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useCan } from "@/hooks/api/access";
import { useOrgMembers } from "@/hooks/api/organization";
import type { StepSharedProps } from "../use-project-create";

export function StepTeam({ draft, updateDraft }: StepSharedProps) {
  const canManage = useCan("projects:manage");
  const { data: membersData } = useOrgMembers(1, 100);
  const members = membersData?.data ?? [];
  const [search, setSearch] = useState("");

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
  }

  function handleToggle(userId: string) {
    const next = draft.memberIds.includes(userId)
      ? draft.memberIds.filter((id) => id !== userId)
      : [...draft.memberIds, userId];
    updateDraft({ memberIds: next });
  }

  const filtered = members.filter((m) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (m.name ?? "").toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
  });

  if (!canManage) {
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-dashed p-6 text-center">
        <User className="mx-auto h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm font-medium text-muted-foreground">
          You don&apos;t have invite permissions.
        </p>
        <p className="text-xs text-muted-foreground">
          You can add team members after the project is created.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Select members to add to this project.</p>
        {draft.memberIds.length > 0 && (
          <Badge variant="secondary">{draft.memberIds.length} selected</Badge>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or email…"
          value={search}
          onChange={handleSearch}
          className="pl-9"
        />
      </div>

      <div className="space-y-1 max-h-72 overflow-y-auto">
        {filtered.length === 0 && (
          <p className="text-sm text-center py-6 text-muted-foreground">No members found.</p>
        )}
        {filtered.map((m) => {
          const isSelected = draft.memberIds.includes(m.userId);
          return (
            <div
              key={m.userId}
              onClick={() => handleToggle(m.userId)}
              className={cn(
                "flex items-center gap-3 rounded-lg p-2.5 cursor-pointer transition-colors",
                isSelected ? "bg-primary/5" : "hover:bg-muted"
              )}
            >
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => handleToggle(m.userId)}
                className="shrink-0"
              />
              <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                {m.name ? m.name.charAt(0).toUpperCase() : <User className="h-3.5 w-3.5" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{m.name ?? m.email}</div>
                {m.name && (
                  <div className="text-xs text-muted-foreground truncate">{m.email}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
