"use client";

import { useCallback, type ReactNode } from "react";
import { Pencil, Shield } from "lucide-react";
import { Trash2Icon } from "@animateicons/react/lucide";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { STANDARD_PAGE_SIZE_OPTIONS } from "@/lib/list-pagination";
import type { PaginatedRolesResponse, RoleListRow } from "@/hooks/api/roles";
import type { Role } from "@/types/organization";

function RenameRoleButton({ onClick }: { onClick: (e: React.MouseEvent) => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      aria-label="Rename role"
    >
      <Pencil className="h-3.5 w-3.5" />
    </button>
  );
}

function DeleteRoleButton({ onClick }: { onClick: (e: React.MouseEvent) => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <button
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
      aria-label="Delete role"
      {...hoverHandlers}
    >
      <Trash2Icon ref={iconRef} size={14} />
    </button>
  );
}

interface RoleListItemProps {
  role: RoleListRow;
  isSelected: boolean;
  onSelect: (roleId: number) => void;
  onDelete: (role: RoleListRow) => void;
  onRename: (role: Role) => void;
}

function RoleListItem({ role, isSelected, onSelect, onDelete, onRename }: RoleListItemProps) {
  const handleSelect = useCallback(() => onSelect(role.id), [role.id, onSelect]);
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onSelect(role.id);
      }
    },
    [role.id, onSelect],
  );
  const handleDelete = useCallback(
    (event: React.MouseEvent) => { event.stopPropagation(); onDelete(role); },
    [role, onDelete],
  );
  const handleRename = useCallback(
    (event: React.MouseEvent) => { event.stopPropagation(); onRename(role); },
    [role, onRename],
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleSelect}
      onKeyDown={handleKeyDown}
      className={cn(
        "w-full text-left border-l-2 border-transparent px-4 py-3 hover:bg-muted/30 transition-colors flex items-center justify-between cursor-pointer",
        isSelected && "bg-primary/5 border-primary",
      )}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{role.name}</p>
        <p className="text-dense text-muted-foreground">
          {role.permissionCount} permission
          {role.permissionCount === 1 ? "" : "s"}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {role.isSystem && (
          <Badge variant="outline" className="text-micro px-1.5">System</Badge>
        )}
        {!role.isSystem && (
          <>
            <RenameRoleButton onClick={handleRename} />
            <DeleteRoleButton onClick={handleDelete} />
          </>
        )}
      </div>
    </div>
  );
}

export interface RolesListPanelProps {
  isLoading: boolean;
  rolesError: boolean;
  rolesQueryError: unknown;
  roles: RoleListRow[];
  search: string;
  pagination: PaginatedRolesResponse["pagination"];
  selectedRoleId: number | null;
  onRetry: () => void;
  onSelect: (roleId: number) => void;
  onDelete: (role: RoleListRow) => void;
  onRename: (role: Role) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (limit: number) => void;
  onClearSearch?: () => void;
}

export function RolesListPanel({
  isLoading,
  rolesError,
  rolesQueryError,
  roles,
  search,
  pagination,
  selectedRoleId,
  onRetry,
  onSelect,
  onDelete,
  onRename,
  onPageChange,
  onPageSizeChange,
  onClearSearch,
}: RolesListPanelProps) {
  let body: ReactNode;

  if (isLoading) {
    body = (
      <div className="h-full min-h-0 flex-1 overflow-y-auto scrollbar-hide">
        <div className="divide-y divide-border/60">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-4 w-12 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  } else if (rolesError) {
    body = (
      <div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center gap-3 px-4 py-12 text-center">
        <Shield className="h-10 w-10 text-destructive/50" />
        <div>
          <p className="text-sm font-medium">Failed to load roles</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {getErrorMessage(rolesQueryError)}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={onRetry} className="gap-1.5">
          Retry
        </Button>
      </div>
    );
  } else if (roles.length === 0) {
    body = (
      <EmptyState
        illustrationPreset="security"
        title="No roles yet"
        description={search.trim() ? "No results match your filters." : "Create a role to manage permissions."}
        filtersActive={!!search.trim()}
        onClearFilters={onClearSearch}
        compact
        className="h-full min-h-0 flex-1 border-0 bg-transparent"
      />
    );
  } else {
    body = (
      <div className="h-full min-h-0 flex-1 overflow-y-auto scrollbar-hide">
        <div className="divide-y divide-border/60">
          {roles.map((role) => (
            <RoleListItem
              key={role.id}
              role={role}
              isSelected={selectedRoleId === role.id}
              onSelect={onSelect}
              onDelete={onDelete}
              onRename={onRename}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <Card className="flex h-full min-h-0 flex-col overflow-hidden">
      <CardHeader className="shrink-0 gap-0 border-b px-3 py-2 [.border-b]:pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Shield className="h-4 w-4" /> Roles
        </CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
        {body}
        {!isLoading && !rolesError && roles.length > 0 ? (
          <div
            className={cn(
              "mt-auto shrink-0 border-t px-1.5",
              "[&>div]:!flex-row [&>div]:!flex-nowrap [&>div]:!items-center [&>div]:!justify-between [&>div]:!gap-1 [&>div]:!py-2 [&>div]:!px-0",
              "[&>div>div:first-child]:min-w-0 [&>div>div:first-child]:gap-1",
              "[&>div>div:first-child>span.tabular-nums]:!hidden",
              "[&>div>div:first-child>div>span]:!hidden",
              "[&>div>div:last-child]:shrink-0",
              "[&>div>div:last-child>div]:!hidden [&>div>div:last-child>span]:!inline",
              "[&_button]:!size-7 [&_button_svg]:!size-3.5",
              "[&_[data-slot=select-trigger]]:!h-7 [&_[data-slot=select-trigger]]:!w-[4.75rem] [&_[data-slot=select-trigger]]:!px-2",
            )}
          >
            <DataTablePagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              limit={pagination.limit}
              onPageChange={onPageChange}
              onLimitChange={onPageSizeChange}
              pageSizeOptions={STANDARD_PAGE_SIZE_OPTIONS}
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
