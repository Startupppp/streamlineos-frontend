"use client";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { statusToneClasses } from "@/lib/design-tokens";
import { formatShortDate } from "@/lib/date-utils";
import { MODULE_LABELS } from "@/components/rbac/permission-matrix-types";
import type { ExplainedPermission, GrantSource } from "@/hooks/api/roles-schema";
import {
  GRANT_SOURCE_LABELS,
  GRANT_SOURCE_NAMES_ITS_GRANTOR,
  GRANT_SOURCE_TONES,
  SCOPE_LABELS,
  SCOPE_TONES,
  TEAM_SCOPE_EXPLANATION,
} from "./effective-access-labels";
import { actionOf, resourceOf } from "@/lib/rbac/administering-module";

function getPermissionRowKey(row: ExplainedPermission): string {
  return row.permissionKey;
}

function PermissionCell(row: ExplainedPermission) {
  return (
    <div className="flex min-w-0 flex-col">
      <span className="truncate font-mono text-[11px] text-foreground">
        {row.permissionKey}
      </span>
      <span className="truncate text-[11px] text-muted-foreground">
        {MODULE_LABELS[row.moduleKey] ?? row.moduleKey} · {resourceOf(row.permissionKey)}
      </span>
    </div>
  );
}

function ActionCell(row: ExplainedPermission) {
  return <span className="text-sm">{actionOf(row.permissionKey)}</span>;
}

function ScopeCell(row: ExplainedPermission) {
  return <ScopeBadge scope={row.scope} />;
}

function SourcesCell(row: ExplainedPermission) {
  return (
    <div className="flex flex-wrap gap-1">
      {row.sources.map((source, index) => (
        <SourceBadge
          key={`${source.kind}-${source.label}-${index}`}
          source={source}
        />
      ))}
      {row.sources.length === 0 ? (
        <span className="text-[11px] text-muted-foreground">
          Source unavailable
        </span>
      ) : null}
    </div>
  );
}

function ExpiresCell(row: ExplainedPermission) {
  if (row.expiresAt === null)
    return <span className="text-[11px] text-muted-foreground">Never</span>;
  const warning = statusToneClasses("warning");
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-5 px-2 py-0.5 font-mono text-[10px] tabular-nums",
        warning.surface,
        warning.ink,
        warning.rule,
      )}
    >
      {formatShortDate(row.expiresAt)}
    </Badge>
  );
}

interface ScopeBadgeProps {
  scope: ExplainedPermission["scope"];
}

/**
 * `team` is labelled for what it does, not for what it is named. It is the one
 * scope the data layer does not implement, so showing it as a wider grant than
 * `own` would mislead the person deciding whether to narrow it.
 */
export function ScopeBadge({ scope }: ScopeBadgeProps) {
  const tone = statusToneClasses(SCOPE_TONES[scope]);
  const isInert = scope === "team";
  return (
    <Badge
      variant="outline"
      className={cn("h-5 px-2 py-0.5 text-[10px]", tone.surface, tone.ink, tone.rule)}
      title={isInert ? TEAM_SCOPE_EXPLANATION : undefined}
    >
      {isInert ? "Team — behaves as Own" : SCOPE_LABELS[scope]}
    </Badge>
  );
}

interface SourceBadgeProps {
  source: GrantSource;
}

function SourceBadge({ source }: SourceBadgeProps) {
  const tone = statusToneClasses(GRANT_SOURCE_TONES[source.kind]);
  const kindLabel = GRANT_SOURCE_LABELS[source.kind];
  const showsOwnLabel =
    GRANT_SOURCE_NAMES_ITS_GRANTOR.has(source.kind) && source.label.length > 0;
  return (
    <Badge
      variant="outline"
      className={cn("h-5 px-2 py-0.5 text-[10px]", tone.surface, tone.ink, tone.rule)}
    >
      {showsOwnLabel ? `${kindLabel}: ${source.label}` : kindLabel}
    </Badge>
  );
}

const COLUMNS: DataTableColumn<ExplainedPermission>[] = [
  {
    key: "permission",
    header: "Permission",
    cell: PermissionCell,
    className: "min-w-0",
  },
  { key: "action", header: "Action", cell: ActionCell },
  { key: "scope", header: "Scope", cell: ScopeCell },
  { key: "sources", header: "Source of grant", cell: SourcesCell },
  { key: "expires", header: "Expires", cell: ExpiresCell },
];

interface EffectiveAccessTableProps {
  rows: ExplainedPermission[];
  isLoading: boolean;
  hasFilters: boolean;
  pageSize: number;
  onPageSizeChange: (pageSize: number) => void;
}

export function EffectiveAccessTable({
  rows,
  isLoading,
  hasFilters,
  pageSize,
  onPageSizeChange,
}: EffectiveAccessTableProps) {
  const emptyState = hasFilters ? (
    <EmptyState
      className="min-h-[40vh] border-0 bg-transparent"
      title="No matching permissions"
      description="No permission matches the current module or search filter."
    />
  ) : (
    <EmptyState
      className="min-h-[40vh] border-0 bg-transparent"
      title="No effective permissions"
      description="This person resolves to no permissions at all in this organization."
    />
  );

  return (
    <DataTable
      data={rows}
      columns={COLUMNS}
      getRowKey={getPermissionRowKey}
      isLoading={isLoading}
      emptyState={emptyState}
      minWidth="920px"
      className="flex-1 min-h-0"
      pagination={{ pageSize, onPageSizeChange }}
    />
  );
}
