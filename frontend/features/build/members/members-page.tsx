"use client";

import {
  useState,
  useCallback,
  useMemo,
  useTransition,
  useEffect,
} from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { keepPreviousData } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SearchInput } from "@/components/ui/search-input";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { TruncatedText } from "@/components/ui/truncated-text";
import { LoadingButton } from "@/components/ui/loading-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  ResponsivePopover,
  ResponsivePopoverContent,
  ResponsivePopoverTrigger,
} from "@/components/ui/responsive-popover";
import { MemberPicker } from "@/components/members/member-picker";
import {
  useProjectWorkspaceMembers,
  useAddProjectWorkspaceMember,
  useRemoveProjectWorkspaceMember,
} from "@/hooks/api/build/workspace-members";
import type { ProjectWorkspaceMember } from "@/hooks/api/build/workspace-members";
import { useCan } from "@/hooks/api/access";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import {
  getUserDisplayName,
  getUserInitials,
} from "@/features/build/shared/resolve-user-name";
import { DisplayToggleRow } from "@/features/build/shared/display-toggle-row";
import { PmAccessButton } from "@/features/build/members/pm-access-sheet";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import { SlidersHorizontalIcon, PlusIcon, EllipsisIcon } from "@animateicons/react/lucide";

const DISPLAY_PROPS_KEY = "projects_members_display_props";

interface DisplayProps {
  showRole: boolean;
  showAdded: boolean;
  showTeams: boolean;
}

const DEFAULT_DISPLAY: DisplayProps = {
  showRole: true,
  showAdded: true,
  showTeams: true,
};

function loadDisplayProps(): DisplayProps {
  if (typeof window === "undefined") return DEFAULT_DISPLAY;
  try {
    const raw = localStorage.getItem(DISPLAY_PROPS_KEY);
    if (!raw) return DEFAULT_DISPLAY;
    const parsed = JSON.parse(raw) as Partial<DisplayProps>;
    return { ...DEFAULT_DISPLAY, ...parsed };
  } catch {
    return DEFAULT_DISPLAY;
  }
}

function saveDisplayProps(props: DisplayProps): void {
  try {
    localStorage.setItem(DISPLAY_PROPS_KEY, JSON.stringify(props));
  } catch {}
}

const DISPLAY_PROP_ITEMS: { key: keyof DisplayProps; label: string }[] = [
  { key: "showRole", label: "Role" },
  { key: "showAdded", label: "Added" },
  { key: "showTeams", label: "Teams" },
];

function WorkspaceRoleBadge({ role }: { role: "member" | "admin" }) {
  if (role === "admin") {
    return (
      <Badge className="h-[18px] px-1.5 text-[10px] font-medium bg-primary/10 text-foreground border border-primary/20 hover:bg-primary/10">
        Admin
      </Badge>
    );
  }
  return (
    <Badge
      variant="secondary"
      className="h-[18px] px-1.5 text-[10px] font-medium"
    >
      Member
    </Badge>
  );
}

function DisplayPropsToggle({
  value,
  onChange,
}: {
  value: DisplayProps;
  onChange: (next: DisplayProps) => void;
}) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  function handleToggle(key: keyof DisplayProps, checked: boolean) {
    onChange({ ...value, [key]: checked });
  }

  return (
    <ResponsivePopover>
      <ResponsivePopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 min-h-9 gap-1.5 text-xs shrink-0"
          {...hoverHandlers}
        >
          <SlidersHorizontalIcon ref={iconRef} size={13} />
          Display
        </Button>
      </ResponsivePopoverTrigger>
      <ResponsivePopoverContent align="end" title="Display properties" className="w-52 p-3">
        <p className="mb-3 text-[13px] font-semibold text-foreground">
          Display properties
        </p>
        <div>
          {DISPLAY_PROP_ITEMS.map(({ key, label }) => (
            <DisplayToggleRow
              key={key}
              id={`dp-${key}`}
              label={label}
              checked={value[key]}
              onCheckedChange={(checked) => handleToggle(key, checked)}
            />
          ))}
        </div>
      </ResponsivePopoverContent>
    </ResponsivePopover>
  );
}

function AddMemberButton({ onClick }: { onClick: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button size="sm" className="h-9 min-h-9 gap-1.5 text-xs" onClick={onClick} {...hoverHandlers}>
      <PlusIcon ref={iconRef} size={14} />
      Add member
    </Button>
  );
}

interface AddMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function AddMemberDialog({ open, onOpenChange }: AddMemberDialogProps) {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<"member" | "admin">("member");

  const addMember = useAddProjectWorkspaceMember();

  function handleUserChange(userId: string | null) {
    setSelectedUserId(userId);
  }

  function handleRoleChange(value: string) {
    setSelectedRole(value as "member" | "admin");
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setSelectedUserId(null);
      setSelectedRole("member");
    }
    onOpenChange(nextOpen);
  }

  function handleSubmit() {
    if (!selectedUserId) return;
    addMember.mutate(
      { userId: selectedUserId, role: selectedRole },
      {
        onSuccess: () => {
          toast.success("Member added to workspace.");
          handleOpenChange(false);
        },
        onError: (err) => {
          toast.error(getErrorMessage(err));
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add member</DialogTitle>
          <DialogDescription>
            Pick an org member to add to this workspace.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-1">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-foreground" htmlFor="add-member-picker">
              Member
            </label>
            <MemberPicker
              mode="single"
              value={selectedUserId ?? undefined}
              onChange={handleUserChange}
              placeholder="Select a member…"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-foreground" htmlFor="add-member-role">
              Role
            </label>
            <Select value={selectedRole} onValueChange={handleRoleChange}>
              <SelectTrigger id="add-member-role" className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleOpenChange(false)}
            disabled={addMember.isPending}
          >
            Cancel
          </Button>
          <LoadingButton
            type="button"
            size="sm"
            isPending={addMember.isPending}
            loadingText="Adding…"
            disabled={!selectedUserId}
            onClick={handleSubmit}
          >
            Add member
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface MemberActionsProps {
  member: ProjectWorkspaceMember;
  onRemove: (member: ProjectWorkspaceMember) => void;
}

function MemberActions({ member, onRemove }: MemberActionsProps) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  function handleRemoveSelect() {
    onRemove(member);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          aria-label="Member actions"
          {...hoverHandlers}
        >
          <EllipsisIcon ref={iconRef} size={14} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem variant="destructive" onSelect={handleRemoveSelect}>
          Remove from workspace
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function MembersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const q = searchParams.get("search") ?? "";
  const page = Number(searchParams.get("page") ?? "1");

  const [search, setSearch] = useState(q);
  const debouncedSearch = useDebouncedValue(search, 300);

  const [displayProps, setDisplayProps] =
    useState<DisplayProps>(loadDisplayProps);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<ProjectWorkspaceMember | null>(null);

  const removeConfirmOpen = removeTarget !== null;

  const pushParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v === null || v === "1") params.delete(k);
        else params.set(k, v);
      }
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [searchParams, router, pathname],
  );

  useEffect(() => {
    if (debouncedSearch === (q || "")) return;
    pushParams({ search: debouncedSearch || null, page: null });
  }, [debouncedSearch, q, pushParams]);

  const handleSearchChange = useCallback(
    (value: string) => setSearch(value),
    [],
  );

  const handlePageChange = useCallback(
    (p: number) => pushParams({ page: p === 1 ? null : String(p) }),
    [pushParams],
  );

  const handleDisplayChange = useCallback((next: DisplayProps) => {
    setDisplayProps(next);
    saveDisplayProps(next);
  }, []);

  const canView = useCan("build:members:view");
  const canManage = useCan("build:members:manage");

  const { data, isLoading, isError, error, refetch } =
    useProjectWorkspaceMembers(
      {
        page,
        limit: 25,
        search: q || undefined,
      },
      { placeholderData: keepPreviousData },
    );

  const removeMember = useRemoveProjectWorkspaceMember();

  const handleRetry = useCallback(() => {
    void refetch().catch(() => {
      toast.error(getErrorMessage(error));
    });
  }, [refetch, error]);

  const handleRemoveRequest = useCallback((member: ProjectWorkspaceMember) => {
    setRemoveTarget(member);
  }, []);

  const handleRemoveConfirmOpenChange = useCallback((open: boolean) => {
    if (!open) setRemoveTarget(null);
  }, []);

  const handleRemoveConfirm = useCallback(() => {
    if (!removeTarget) return;
    const targetId = removeTarget.id;
    const targetName = getUserDisplayName(removeTarget);
    removeMember.mutate(targetId, {
      onSuccess: () => {
        toast.success(`${targetName} removed from workspace.`);
        setRemoveTarget(null);
      },
      onError: (err) => {
        toast.error(getErrorMessage(err));
      },
    });
  }, [removeTarget, removeMember]);

  const members = data?.data ?? [];
  const total = data?.total ?? 0;

  const columns = useMemo<DataTableColumn<ProjectWorkspaceMember>[]>(() => {
    const cols: DataTableColumn<ProjectWorkspaceMember>[] = [
      {
        key: "name",
        header: "Name",
        sortable: true,
        sortValue: (m) => getUserDisplayName(m),
        cell: (member) => {
          const displayName = getUserDisplayName(member);
          const handle = member.email.split("@")[0] ?? member.email;
          return (
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarImage src={member.image ?? undefined} alt={displayName} />
                <AvatarFallback className="text-[10px] font-semibold bg-primary/10 text-foreground">
                  {getUserInitials(member)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <TruncatedText
                  text={displayName}
                  className="text-[12px] font-medium leading-tight text-foreground"
                />
                <TruncatedText
                  text={`@${handle}`}
                  className="text-[10px] text-muted-foreground leading-tight"
                />
              </div>
            </div>
          );
        },
      },
    ];

    if (displayProps.showRole) {
      cols.push({
        key: "role",
        header: "Role",
        cell: (member) => <WorkspaceRoleBadge role={member.role} />,
      });
    }

    if (displayProps.showAdded) {
      cols.push({
        key: "addedAt",
        header: "Added",
        sortable: true,
        sortValue: (m) => m.addedAt,
        className: "tabular-nums",
        cell: (member) => (
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {formatDistanceToNow(new Date(member.addedAt), { addSuffix: true })}
          </span>
        ),
      });
    }

    if (displayProps.showTeams) {
      cols.push({
        key: "teams",
        header: "Teams",
        cell: (member) => {
          if (!member.teams.length) {
            return <span className="text-[11px] text-muted-foreground">—</span>;
          }
          return (
            <div className="flex flex-wrap gap-1">
              {member.teams.map((t) => (
                <Badge
                  key={t}
                  variant="outline"
                  className="h-[18px] px-1.5 text-[10px] font-normal"
                >
                  {t}
                </Badge>
              ))}
            </div>
          );
        },
      });
    }

    if (canManage) {
      cols.push({
        key: "actions",
        header: "",
        className: "w-10 text-right",
        cell: (member) => (
          <MemberActions member={member} onRemove={handleRemoveRequest} />
        ),
      });
    }

    return cols;
  }, [displayProps, canManage, handleRemoveRequest]);

  return (
    <>
      <PageWrapper
        title="Members"
        subtitle="Workspace members and their roles."
        noInternalScroll
        filtersClassName="flex-col items-stretch gap-2 overflow-x-visible"
        filters={
          <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:flex-nowrap sm:items-center sm:gap-2 sm:overflow-x-auto sm:overscroll-x-contain sm:scrollbar-hide sm:touch-pan-x">
            <div className="flex w-full min-w-0 items-center gap-1.5 sm:contents">
              <div className="shrink-0 sm:order-2">
                <DisplayPropsToggle
                  value={displayProps}
                  onChange={handleDisplayChange}
                />
              </div>
              {canManage ? (
                <div className="shrink-0 sm:order-3">
                  <PmAccessButton />
                </div>
              ) : null}
              {canManage ? (
                <div className="ml-auto shrink-0 sm:order-4 sm:ml-0">
                  <AddMemberButton onClick={() => setAddDialogOpen(true)} />
                </div>
              ) : null}
            </div>
            <div className="flex w-full min-w-0 items-center gap-1.5 sm:contents">
              <SearchInput
                placeholder="Search members…"
                value={search}
                onValueChange={handleSearchChange}
                aria-label="Search members"
                className="h-9"
                inputClassName="h-9 min-h-9"
              />
            </div>
          </div>
        }
      >
        {!canView ? (
          <EmptyState
            illustrationPreset="team"
            title="Access restricted"
            description="You don't have permission to view workspace members."
          />
        ) : isError ? (
          <ErrorState
            title="Failed to load members"
            description={getErrorMessage(error)}
            onRetry={handleRetry}
          />
        ) : (
          <DataTable
            className="flex-1 min-h-0"
            data={members}
            columns={columns}
            getRowKey={(member) => member.id}
            isLoading={isLoading}
            emptyState={
              <EmptyState
                illustrationPreset="team"
                title={q ? "No members found" : "No members yet"}
                description={
                  q
                    ? "Try adjusting your search."
                    : canManage
                      ? "Add the first member to this workspace."
                      : "Workspace members will appear here."
                }
                action={
                  !q && canManage
                    ? { label: "Add member", onClick: () => setAddDialogOpen(true) }
                    : undefined
                }
              />
            }
            pagination={{
              mode: "server",
              page,
              pageSize: 25,
              total,
              onPageChange: handlePageChange,
            }}
            minWidth="640px"
          />
        )}
      </PageWrapper>

      <AddMemberDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
      />

      <ConfirmDialog
        open={removeConfirmOpen}
        onOpenChange={handleRemoveConfirmOpenChange}
        title="Remove member?"
        description={
          removeTarget
            ? `${getUserDisplayName(removeTarget)} will be removed from this workspace.`
            : "This member will be removed from the workspace."
        }
        confirmLabel="Remove"
        cancelLabel="Cancel"
        destructive
        isPending={removeMember.isPending}
        onConfirm={handleRemoveConfirm}
      />
    </>
  );
}
