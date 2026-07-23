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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { SearchInput } from "@/components/ui/search-input";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { TruncatedText } from "@/components/ui/truncated-text";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { useProjectWorkspaceMembers } from "@/hooks/api/projects/workspace-members";
import type { User } from "@/hooks/api/users";
import { useCan } from "@/hooks/api/access";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import {
  getUserDisplayName,
  getUserInitials,
} from "@/features/projects/shared/resolve-user-name";
import { PmAccessButton } from "@/features/projects/members/pm-access-sheet";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import { SlidersHorizontalIcon } from "@animateicons/react/lucide";

const DISPLAY_PROPS_KEY = "projects_members_display_props";

interface DisplayProps {
  showStatus: boolean;
  showJoined: boolean;
  showTeams: boolean;
  showLastSeen: boolean;
}

const DEFAULT_DISPLAY: DisplayProps = {
  showStatus: true,
  showJoined: true,
  showTeams: true,
  showLastSeen: true,
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
  { key: "showStatus", label: "Status" },
  { key: "showJoined", label: "Joined" },
  { key: "showTeams", label: "Teams" },
  { key: "showLastSeen", label: "Last seen" },
];

function MemberStatusBadge({ role }: { role: string }) {
  const normalized = role.toUpperCase();
  if (normalized === "OWNER") {
    return (
      <Badge className="h-[18px] px-1.5 text-[10px] font-medium bg-primary/10 text-foreground border border-primary/20 hover:bg-primary/10">
        Owner
      </Badge>
    );
  }
  if (normalized === "ADMIN") {
    return (
      <Badge className="h-[18px] px-1.5 text-[10px] font-medium bg-primary/10 text-foreground border border-primary/20 hover:bg-primary/10">
        Admin
      </Badge>
    );
  }
  if (normalized === "MEMBER") {
    return (
      <Badge
        variant="secondary"
        className="h-[18px] px-1.5 text-[10px] font-medium"
      >
        Member
      </Badge>
    );
  }
  if (
    normalized === "INVITED" ||
    normalized === "PENDING" ||
    normalized === "APPLICATION"
  ) {
    return (
      <Badge className="h-[18px] px-1.5 text-[10px] font-medium bg-amber-500/10 text-amber-600 border border-amber-500/20 dark:text-amber-400 dark:border-amber-500/30 dark:bg-amber-500/10 hover:bg-amber-500/10">
        Application
      </Badge>
    );
  }
  return (
    <Badge
      variant="secondary"
      className="h-[18px] px-1.5 text-[10px] font-medium"
    >
      {role}
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

  function handleToggle(key: keyof DisplayProps) {
    onChange({ ...value, [key]: !value[key] });
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 min-h-9 gap-1.5 text-xs shrink-0"
          {...hoverHandlers}
        >
          <SlidersHorizontalIcon ref={iconRef} size={13} />
          Display
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-48 p-3">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2.5">
          Display properties
        </p>
        <div className="flex flex-col gap-3">
          {DISPLAY_PROP_ITEMS.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between gap-2">
              <Label
                htmlFor={`dp-${key}`}
                className="text-xs cursor-pointer select-none"
              >
                {label}
              </Label>
              <Switch
                id={`dp-${key}`}
                checked={value[key]}
                onCheckedChange={() => handleToggle(key)}
                className="h-4 w-7 [&>span]:h-3 [&>span]:w-3"
              />
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function MembersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const q = searchParams.get("search") ?? "";
  const statusFilter = searchParams.get("status") ?? "all";
  const page = Number(searchParams.get("page") ?? "1");

  const [search, setSearch] = useState(q);
  const debouncedSearch = useDebouncedValue(search, 300);

  const [displayProps, setDisplayProps] =
    useState<DisplayProps>(loadDisplayProps);

  const pushParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v === null || v === "all" || v === "1") params.delete(k);
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

  const handleStatusChange = useCallback(
    (value: string) => pushParams({ status: value, page: null }),
    [pushParams],
  );

  const handlePageChange = useCallback(
    (p: number) => pushParams({ page: p === 1 ? null : String(p) }),
    [pushParams],
  );

  const handleDisplayChange = useCallback((next: DisplayProps) => {
    setDisplayProps(next);
    saveDisplayProps(next);
  }, []);

  const canView = useCan("projects:members:view");
  const canManage = useCan("projects:members:manage");

  const { data, isLoading, isError, error, refetch } =
    useProjectWorkspaceMembers(
      {
        page,
        limit: 25,
        search: q || undefined,
        status:
          statusFilter !== "all"
            ? (statusFilter as "active" | "suspended" | "archived")
            : undefined,
      },
      { placeholderData: keepPreviousData, enabled: canView },
    );

  const handleRetry = useCallback(() => {
    void refetch().catch(() => {
      toast.error(getErrorMessage(error));
    });
  }, [refetch, error]);

  const members = data?.data ?? [];
  const pagination = data?.pagination;

  const columns = useMemo<DataTableColumn<User>[]>(() => {
    const cols: DataTableColumn<User>[] = [
      {
        key: "name",
        header: "Name",
        sortable: true,
        sortValue: (u) => getUserDisplayName(u),
        cell: (user) => {
          const displayName = getUserDisplayName(user);
          const handle = user.email.split("@")[0] ?? user.email;
          return (
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarImage src={user.image ?? undefined} alt={displayName} />
                <AvatarFallback className="text-[10px] font-semibold bg-primary/10 text-foreground">
                  {getUserInitials(user)}
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

    if (displayProps.showStatus) {
      cols.push({
        key: "status",
        header: "Status",
        cell: (user) => <MemberStatusBadge role={user.role} />,
      });
    }

    if (displayProps.showJoined) {
      cols.push({
        key: "joined",
        header: "Joined",
        sortable: true,
        sortValue: (u) => u.joinedAt ?? u.createdAt,
        className: "tabular-nums",
        cell: (user) => (
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {formatDistanceToNow(new Date(user.joinedAt ?? user.createdAt), {
              addSuffix: true,
            })}
          </span>
        ),
      });
    }

    if (displayProps.showTeams) {
      cols.push({
        key: "teams",
        header: "Teams",
        cell: (user) => {
          const teamList = user.teams?.length ? user.teams : null;
          if (!teamList) {
            return <span className="text-[11px] text-muted-foreground">—</span>;
          }
          return (
            <div className="flex flex-wrap gap-1">
              {teamList.map((t) => (
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

    if (displayProps.showLastSeen) {
      cols.push({
        key: "lastSeen",
        header: "Last seen",
        className: "tabular-nums",
        cell: (user) => (
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {user.lastSeenAt
              ? formatDistanceToNow(new Date(user.lastSeenAt), {
                  addSuffix: true,
                })
              : "—"}
          </span>
        ),
      });
    }

    return cols;
  }, [displayProps]);

  return (
    <PageWrapper
      title="Members"
      subtitle="Workspace members and their roles."
      noInternalScroll
      filtersClassName="flex-col items-stretch gap-2 overflow-x-visible"
      filters={
        <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:flex-nowrap sm:items-center sm:gap-2 sm:overflow-x-auto sm:overscroll-x-contain sm:scrollbar-hide sm:touch-pan-x">
          <div className="flex w-full min-w-0 items-center gap-1.5 sm:contents">
            <div className="shrink-0 sm:order-2">
              <Select value={statusFilter} onValueChange={handleStatusChange}>
                <SelectTrigger
                  size="sm"
                  className={`w-fit min-w-[7.5rem] ${FILTER_SELECT_TRIGGER}`}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="shrink-0 sm:order-3">
              <DisplayPropsToggle
                value={displayProps}
                onChange={handleDisplayChange}
              />
            </div>
            {canManage ? (
              <div className="ml-auto shrink-0 sm:order-4 sm:ml-0">
                <PmAccessButton />
              </div>
            ) : null}
          </div>
          <div className="flex w-full min-w-0 items-center gap-1.5 sm:contents">
            <div className="min-w-0 flex-1 sm:order-1 sm:w-[200px] sm:max-w-[min(240px,70vw)] sm:flex-none md:w-[240px]">
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
          getRowKey={(user) => user.id}
          isLoading={isLoading}
          emptyState={
            <EmptyState
              illustrationPreset="team"
              title={
                q || statusFilter !== "all"
                  ? "No members found"
                  : "No members yet"
              }
              description={
                q || statusFilter !== "all"
                  ? "Try adjusting your search or filters."
                  : "Workspace members will appear here."
              }
            />
          }
          pagination={{
            mode: "server",
            page,
            pageSize: 25,
            total: pagination?.total ?? 0,
            onPageChange: handlePageChange,
          }}
          minWidth="640px"
        />
      )}
    </PageWrapper>
  );
}
