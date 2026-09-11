"use client";

import { useState, useCallback } from "react";
import { Trash2, Users, Shield } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { LoadingButton } from "@/components/ui/loading-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { useOrgMembers } from "@/hooks/api/organization";
import { useRoles } from "@/hooks/api/roles";
import {
  useGroupMembers,
  useGroupRoles,
  useAddGroupMember,
  useRemoveGroupMember,
  useAssignGroupRole,
  useUnassignGroupRole,
  type PrincipalGroup,
} from "@/hooks/api/principal-groups";
import { getInitials } from "@/lib/format-utils";
import { resolveImageUrl } from "@/lib/utils";

interface GroupDetailSheetProps {
  group: PrincipalGroup | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function MemberSearch({ groupId, existingIds }: { groupId: string; existingIds: Set<string> }) {
  const [search, setSearch] = useState("");
  const { data: membersPage } = useOrgMembers(1, 20, search || undefined);
  const addMember = useAddGroupMember(groupId);
  const candidates = membersPage?.data ?? [];

  const handleAdd = useCallback(
    (membershipId: number | undefined) => {
      if (membershipId === undefined) return;
      addMember.mutate(
        { membershipId },
        { onError: (err) => toast.error(getErrorMessage(err)) },
      );
    },
    [addMember],
  );

  return (
    <Command shouldFilter={false} className="rounded-lg border border-border">
      <CommandInput
        placeholder="Search members…"
        value={search}
        onValueChange={setSearch}
      />
      <CommandList className="max-h-40">
        <CommandEmpty>No members found</CommandEmpty>
        <CommandGroup>
          {candidates
            .filter((m) => !existingIds.has(m.userId))
            .map((m) => (
              <CommandItem
                key={m.userId}
                value={m.userId}
                onSelect={() => handleAdd(m.membershipId)}
                className="flex items-center gap-2"
              >
                <Avatar className="h-6 w-6 shrink-0">
                  {m.image && <AvatarImage src={resolveImageUrl(m.image)} alt={m.name ?? ""} />}
                  <AvatarFallback className="text-micro">
                    {getInitials(m.name ?? m.email)}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate text-sm">{m.name ?? m.email}</span>
                <span className="ml-auto truncate text-xs text-muted-foreground">
                  {m.email}
                </span>
              </CommandItem>
            ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

function RoleSearch({ groupId, existingIds }: { groupId: string; existingIds: Set<number> }) {
  const [search, setSearch] = useState("");
  const { data: roles } = useRoles();
  const assignRole = useAssignGroupRole(groupId);

  const filtered = (roles ?? []).filter(
    (r) =>
      !existingIds.has(r.id) &&
      (!search || r.name.toLowerCase().includes(search.toLowerCase())),
  );

  const handleAssign = useCallback(
    (roleId: number) => {
      assignRole.mutate(
        { roleId },
        { onError: (err) => toast.error(getErrorMessage(err)) },
      );
    },
    [assignRole],
  );

  return (
    <Command shouldFilter={false} className="rounded-lg border border-border">
      <CommandInput
        placeholder="Search roles…"
        value={search}
        onValueChange={setSearch}
      />
      <CommandList className="max-h-40">
        <CommandEmpty>No roles found</CommandEmpty>
        <CommandGroup>
          {filtered.map((r) => (
            <CommandItem
              key={r.id}
              value={String(r.id)}
              onSelect={() => handleAssign(r.id)}
              className="flex items-center gap-2"
            >
              <Shield className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate text-sm">{r.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

export function GroupDetailSheet({ group, open, onOpenChange }: GroupDetailSheetProps) {
  const groupId = group?.id ?? "";
  const { data: members, isLoading: membersLoading } = useGroupMembers(groupId, {
    enabled: open && !!groupId,
  });
  const { data: groupRoles, isLoading: rolesLoading } = useGroupRoles(groupId, {
    enabled: open && !!groupId,
  });
  const removeMember = useRemoveGroupMember(groupId);
  const unassignRole = useUnassignGroupRole(groupId);

  const memberUserIds = new Set((members ?? []).map((m) => m.userId));
  const roleIds = new Set((groupRoles ?? []).map((r) => r.id));

  const handleRemoveMember = useCallback(
    (membershipId: number) => {
      removeMember.mutate(
        { membershipId },
        { onError: (err) => toast.error(getErrorMessage(err)) },
      );
    },
    [removeMember],
  );

  const handleUnassignRole = useCallback(
    (roleId: number) => {
      unassignRole.mutate(
        { roleId },
        { onError: (err) => toast.error(getErrorMessage(err)) },
      );
    },
    [unassignRole],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="border-b border-border px-5 py-4">
          <SheetTitle className="truncate">{group?.name ?? "Group"}</SheetTitle>
          <SheetDescription>
            {group?.kind === "ORG_UNIT" ? "Org unit group" : "Custom group"} ·{" "}
            {group?.memberCount ?? 0} member{group?.memberCount !== 1 ? "s" : ""} ·{" "}
            {group?.roleCount ?? 0} role{group?.roleCount !== 1 ? "s" : ""}
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="members" className="flex min-h-0 flex-1 flex-col">
          <TabsList className="mx-5 mt-4 shrink-0">
            <TabsTrigger value="members" className="gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Members
            </TabsTrigger>
            <TabsTrigger value="roles" className="gap-1.5">
              <Shield className="h-3.5 w-3.5" />
              Roles
            </TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="gap-3 px-5 pb-5 pt-3">
            {!!groupId && <MemberSearch groupId={groupId} existingIds={memberUserIds} />}
            <ScrollArea className="flex-1">
              {membersLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }, (_, i) => (
                    <Skeleton key={i} className="h-10 rounded-lg" />
                  ))}
                </div>
              ) : !members?.length ? (
                <div className="flex flex-1 items-center justify-center py-8 text-sm text-muted-foreground">
                  No members yet. Add members above.
                </div>
              ) : (
                <ul className="space-y-1">
                  {members.map((m) => (
                    <li
                      key={m.membershipId}
                      className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-muted/50"
                    >
                      <Avatar className="h-7 w-7 shrink-0">
                        {m.image && <AvatarImage src={resolveImageUrl(m.image)} alt={m.name ?? ""} />}
                        <AvatarFallback className="text-micro">
                          {getInitials(m.name ?? m.email ?? "")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {m.name ?? m.email ?? "Unknown"}
                        </p>
                        {m.email && (
                          <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 shrink-0 p-0 text-muted-foreground hover:text-destructive"
                        aria-label="Remove member"
                        onClick={() => handleRemoveMember(m.membershipId)}
                        disabled={removeMember.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="roles" className="gap-3 px-5 pb-5 pt-3">
            {!!groupId && <RoleSearch groupId={groupId} existingIds={roleIds} />}
            <ScrollArea className="flex-1">
              {rolesLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 2 }, (_, i) => (
                    <Skeleton key={i} className="h-10 rounded-lg" />
                  ))}
                </div>
              ) : !groupRoles?.length ? (
                <div className="flex flex-1 items-center justify-center py-8 text-sm text-muted-foreground">
                  No roles assigned. Assign roles above.
                </div>
              ) : (
                <ul className="space-y-1">
                  {groupRoles.map((r) => (
                    <li
                      key={r.id}
                      className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-muted/50"
                    >
                      <Shield className="h-4 w-4 shrink-0 text-status-info-ink" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{r.name}</p>
                        {r.moduleKey && (
                          <Badge variant="outline" className="mt-0.5 px-1.5 py-0 text-micro">
                            {r.moduleKey}
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 shrink-0 p-0 text-muted-foreground hover:text-destructive"
                        aria-label="Remove role"
                        onClick={() => handleUnassignRole(r.id)}
                        disabled={unassignRole.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
