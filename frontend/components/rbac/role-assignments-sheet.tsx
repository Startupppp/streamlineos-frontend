"use client";

import { useCallback, useState } from "react";
import { Loader2, AlertTriangle, Building2, UserCircle } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
} from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { getApiError } from "@/lib/api-client";
import {
  useRoleMembers,
  useAssignRoleMember,
  useUnassignRoleMember,
} from "@/hooks/api/roles";
import { useOrgMembers } from "@/hooks/api/organization";
import { useHrDepartments } from "@/hooks/api/hr/employees";
import { getInitials } from "@/lib/format-utils";
import type { Role } from "@/types/organization";
import {
  AssignableUserItem,
  AssignableDepartmentItem,
  MemberRow,
  DepartmentRow,
} from "./role-assignment-items";

const ORG_MEMBERS_PAGE_SIZE = 20;

interface RoleAssignmentsSheetProps {
  role: Role | null;
  open: boolean;
  onOpenChange: (value: boolean) => void;
}

export function RoleAssignmentsSheet({
  role,
  open,
  onOpenChange,
}: RoleAssignmentsSheetProps) {
  const handleClose = useCallback(() => onOpenChange(false), [onOpenChange]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col p-0 gap-0 w-full sm:max-w-[520px]">
        {role ? <AssignmentsBody role={role} onClose={handleClose} /> : null}
      </SheetContent>
    </Sheet>
  );
}

interface AssignmentsBodyProps {
  role: Role;
  onClose: () => void;
}

interface EffectiveUser {
  name: string | null;
  email: string | null;
  image: string | null;
  vias: string[];
}

function AssignmentsBody({ role, onClose }: AssignmentsBodyProps) {
  const roleId = role.id;

  const [userSearch, setUserSearch] = useState("");
  const [userPage, setUserPage] = useState(1);

  const membersQuery = useRoleMembers(roleId);
  const orgMembersQuery = useOrgMembers(
    userPage,
    ORG_MEMBERS_PAGE_SIZE,
    userSearch || undefined,
  );
  const departmentsQuery = useHrDepartments();
  const assign = useAssignRoleMember();
  const unassign = useUnassignRoleMember();

  const members = membersQuery.data ?? [];
  const directUsers = members.filter(
    (member) => member.principalType === "user" && member.via === "direct",
  );
  const assignedDepartments = members.filter(
    (member) => member.principalType === "department",
  );
  const directUserIds = new Set(
    directUsers.map((member) => member.principalId),
  );
  const assignedDepartmentIds = new Set(
    assignedDepartments.map((member) => member.principalId),
  );

  const orgMembersPage = orgMembersQuery.data;
  const orgMembers = orgMembersPage?.data ?? [];
  const orgMembersTotalPages = orgMembersPage?.pagination.totalPages ?? 1;
  const departments = departmentsQuery.data ?? [];

  const availableUsers = orgMembers.filter(
    (member) => !directUserIds.has(member.userId),
  );
  const availableDepartments = departments.filter(
    (department) => !assignedDepartmentIds.has(String(department.id)),
  );

  const effectiveUsers = new Map<string, EffectiveUser>();
  for (const member of members) {
    if (member.principalType !== "user") continue;
    const existing = effectiveUsers.get(member.principalId) ?? {
      name: member.name,
      email: member.email,
      image: member.image,
      vias: [],
    };
    const via =
      member.via === "direct"
        ? "Direct"
        : `via ${member.departmentName ?? "Department"}`;
    if (!existing.vias.includes(via)) existing.vias.push(via);
    effectiveUsers.set(member.principalId, existing);
  }
  const effectiveList = Array.from(effectiveUsers.entries());

  const isAdding = useCallback(
    (principalType: "user" | "department", principalId: string | number) =>
      assign.isPending &&
      assign.variables?.principalType === principalType &&
      String(assign.variables?.principalId) === String(principalId),
    [assign.isPending, assign.variables],
  );

  const isRemoving = useCallback(
    (principalType: "user" | "department", principalId: string | number) =>
      unassign.isPending &&
      unassign.variables?.principalType === principalType &&
      String(unassign.variables?.principalId) === String(principalId),
    [unassign.isPending, unassign.variables],
  );

  const handleUserSearchChange = useCallback((value: string) => {
    setUserSearch(value);
    setUserPage(1);
  }, []);

  const handleUserPagePrev = useCallback(() => {
    setUserPage((prev) => Math.max(1, prev - 1));
  }, []);

  const handleUserPageNext = useCallback(() => {
    setUserPage((prev) => prev + 1);
  }, []);

  const handleAddUser = useCallback(
    (userId: string) => {
      assign.mutate(
        { roleId, principalType: "user", principalId: userId },
        {
          onSuccess: () => toast.success("Member assigned"),
          onError: (error) => toast.error(getApiError(error)),
        },
      );
    },
    [assign, roleId],
  );

  const handleRemoveUser = useCallback(
    (userId: string) => {
      unassign.mutate(
        { roleId, principalType: "user", principalId: userId },
        {
          onSuccess: () => toast.success("Member removed"),
          onError: (error) => toast.error(getApiError(error)),
        },
      );
    },
    [unassign, roleId],
  );

  const handleAddDepartment = useCallback(
    (departmentId: number) => {
      assign.mutate(
        { roleId, principalType: "department", principalId: departmentId },
        {
          onSuccess: () => toast.success("Department assigned"),
          onError: (error) => toast.error(getApiError(error)),
        },
      );
    },
    [assign, roleId],
  );

  const handleRemoveDepartment = useCallback(
    (departmentId: number) => {
      unassign.mutate(
        { roleId, principalType: "department", principalId: departmentId },
        {
          onSuccess: () => toast.success("Department removed"),
          onError: (error) => toast.error(getApiError(error)),
        },
      );
    },
    [unassign, roleId],
  );

  const handleRetry = useCallback(() => {
    membersQuery.refetch();
  }, [membersQuery]);

  const isLoading =
    membersQuery.isLoading ||
    orgMembersQuery.isLoading ||
    departmentsQuery.isLoading;

  return (
    <>
      <SheetHeader className="px-6 pt-5 pb-3 border-b border-border/60 shrink-0 text-left gap-1">
        <SheetTitle className="text-base font-semibold">
          Manage members
        </SheetTitle>
        <SheetDescription className="text-sm text-muted-foreground">
          Assign people and departments to{" "}
          <span className="font-medium">{role.name}</span>.
        </SheetDescription>
      </SheetHeader>

      {membersQuery.isError ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <AlertTriangle className="h-8 w-8 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium text-foreground">
              Couldn&apos;t load members
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {getApiError(membersQuery.error)}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleRetry}>
            Try again
          </Button>
        </div>
      ) : isLoading ? (
        <div className="flex-1 px-6 py-5 space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="h-3 w-28" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-6 py-5 space-y-6">
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-1.5">
                  <UserCircle
                    className="h-4 w-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                  Users
                </h3>
                <Badge variant="outline" className="text-[10px]">
                  {directUsers.length} assigned
                </Badge>
              </div>
              <Command className="rounded-md border" shouldFilter={false}>
                <CommandInput
                  placeholder="Search people to assign..."
                  value={userSearch}
                  onValueChange={handleUserSearchChange}
                  aria-label="Search users to assign"
                />
                <CommandList className="max-h-[180px]">
                  {orgMembersQuery.isFetching ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : availableUsers.length === 0 ? (
                    <CommandEmpty>No people found.</CommandEmpty>
                  ) : (
                    <CommandGroup>
                      {availableUsers.map((member) => (
                        <AssignableUserItem
                          key={member.userId}
                          member={member}
                          busy={isAdding("user", member.userId)}
                          onAdd={handleAddUser}
                        />
                      ))}
                    </CommandGroup>
                  )}
                </CommandList>
                {orgMembersTotalPages > 1 && (
                  <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-border/40">
                    <span className="text-[11px] text-muted-foreground">
                      Page {userPage} of {orgMembersTotalPages}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        disabled={userPage <= 1 || orgMembersQuery.isFetching}
                        onClick={handleUserPagePrev}
                        aria-label="Previous page of users"
                      >
                        Prev
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        disabled={
                          userPage >= orgMembersTotalPages ||
                          orgMembersQuery.isFetching
                        }
                        onClick={handleUserPageNext}
                        aria-label="Next page of users"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </Command>
              <div
                className="space-y-1.5"
                role="list"
                aria-label="Directly assigned users"
              >
                {directUsers.length === 0 ? (
                  <p className="text-xs text-muted-foreground px-1">
                    No users directly assigned.
                  </p>
                ) : (
                  directUsers.map((member) => (
                    <MemberRow
                      key={member.id}
                      name={member.name}
                      subtitle={member.email}
                      image={member.image}
                      principalId={member.principalId}
                      removing={isRemoving("user", member.principalId)}
                      onRemove={handleRemoveUser}
                    />
                  ))
                )}
              </div>
            </section>

            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-1.5">
                  <Building2
                    className="h-4 w-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                  Departments
                </h3>
                <Badge variant="outline" className="text-[10px]">
                  {assignedDepartments.length} assigned
                </Badge>
              </div>
              <Command className="rounded-md border">
                <CommandInput
                  placeholder="Search departments to assign..."
                  aria-label="Search departments to assign"
                />
                <CommandList className="max-h-[180px]">
                  <CommandEmpty>No departments found.</CommandEmpty>
                  <CommandGroup>
                    {availableDepartments.map((department) => (
                      <AssignableDepartmentItem
                        key={department.id}
                        department={department}
                        busy={isAdding("department", department.id)}
                        onAdd={handleAddDepartment}
                      />
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
              <div
                className="space-y-1.5"
                role="list"
                aria-label="Assigned departments"
              >
                {assignedDepartments.length === 0 ? (
                  <p className="text-xs text-muted-foreground px-1">
                    No departments assigned.
                  </p>
                ) : (
                  assignedDepartments.map((member) => (
                    <DepartmentRow
                      key={member.id}
                      name={member.name ?? member.departmentName}
                      principalId={Number(member.principalId)}
                      removing={isRemoving("department", member.principalId)}
                      onRemove={handleRemoveDepartment}
                    />
                  ))
                )}
              </div>
            </section>

            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Effective members</h3>
                <Badge variant="outline" className="text-[10px]">
                  {effectiveList.length} total
                </Badge>
              </div>
              {effectiveList.length === 0 ? (
                <p className="text-xs text-muted-foreground px-1">
                  No one has this role yet. Assign users or departments above.
                </p>
              ) : (
                <div
                  className="space-y-1.5"
                  role="list"
                  aria-label="Effective role members"
                >
                  {effectiveList.map(([principalId, user]) => (
                    <div
                      key={principalId}
                      role="listitem"
                      className="flex items-center gap-3 rounded-md border border-border/50 px-3 py-2"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={user.image ?? undefined}
                          alt={user.name ?? ""}
                        />
                        <AvatarFallback className="text-[10px]">
                          {getInitials(user.name ?? user.email ?? "?")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium truncate">
                          {user.name ?? user.email ?? "Unknown"}
                        </p>
                        {user.email && (
                          <p className="text-[11px] text-muted-foreground truncate">
                            {user.email}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-1 shrink-0">
                        {user.vias.map((via) => (
                          <Badge
                            key={via}
                            variant="secondary"
                            className="text-[9px]"
                          >
                            {via}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </ScrollArea>
      )}

      <SheetFooter className="px-6 py-3 border-t border-border/60 shrink-0 flex-row gap-2 sm:justify-end">
        <Button type="button" variant="outline" onClick={onClose}>
          Done
        </Button>
      </SheetFooter>
    </>
  );
}
