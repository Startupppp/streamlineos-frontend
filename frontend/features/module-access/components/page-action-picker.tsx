"use client";

import { useState, useCallback, useMemo } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ModulePermission, DataScope } from "@/hooks/api/module-access";
import {
  type PermDraft,
  type ResourceGroup,
  buildGroups,
  resourceLabel,
  deriveRowState,
  PageIndicator,
  ActionRow,
} from "./page-action-picker-parts";

export interface PageActionPickerProps {
  catalog: ModulePermission[];
  draft: PermDraft;
  onDraftChange: (next: PermDraft) => void;
  readOnly: boolean;
}

interface ResourceRowProps {
  group: ResourceGroup;
  draft: PermDraft;
  onDraftChange: (next: PermDraft) => void;
  readOnly: boolean;
}

function ResourceRow({ group, draft, onDraftChange, readOnly }: ResourceRowProps) {
  const [expanded, setExpanded] = useState(false);
  const { resource, permissions } = group;

  const viewPerm = permissions.find((p) => p.action === "view");
  const rowState = deriveRowState(permissions, draft, viewPerm);
  const grantedCount = permissions.filter(
    (p) => (draft[p.name] ?? "none") !== "none",
  ).length;
  const label = resourceLabel(resource);
  const allGranted = grantedCount === permissions.length && permissions.length > 0;

  const handleIndicatorClick = useCallback(() => {
    const next = { ...draft };
    if (rowState === "unchecked") {
      const target = viewPerm ?? permissions[0];
      if (target) next[target.name] = "all";
    } else if (rowState === "view-only") {
      for (const p of permissions) next[p.name] = "none";
    } else if (rowState === "partial") {
      for (const p of permissions) next[p.name] = "all";
    } else {
      for (const p of permissions) next[p.name] = "none";
    }
    onDraftChange(next);
  }, [draft, rowState, permissions, viewPerm, onDraftChange]);

  const handleLabelClick = useCallback(() => {
    if (rowState !== "unchecked" || readOnly) return;
    const target = viewPerm ?? permissions[0];
    if (!target) return;
    onDraftChange({ ...draft, [target.name]: "all" });
  }, [draft, rowState, readOnly, permissions, viewPerm, onDraftChange]);

  const handleToggleExpand = useCallback(() => setExpanded((v) => !v), []);

  const handleActionCheck = useCallback(
    (permName: string, checked: boolean) => {
      const next: PermDraft = { ...draft, [permName]: checked ? "all" : "none" };
      if (checked && viewPerm && (next[viewPerm.name] ?? "none") === "none") {
        next[viewPerm.name] = "all";
      }
      if (!checked && viewPerm && permName === viewPerm.name) {
        for (const p of permissions) {
          next[p.name] = "none";
        }
      }
      onDraftChange(next);
    },
    [draft, viewPerm, permissions, onDraftChange],
  );

  const handleScopeChange = useCallback(
    (permName: string, scope: DataScope) => {
      onDraftChange({ ...draft, [permName]: scope });
    },
    [draft, onDraftChange],
  );

  const handleBulkToggle = useCallback(() => {
    const next = { ...draft };
    for (const p of permissions) {
      next[p.name] = allGranted ? "none" : "all";
    }
    onDraftChange(next);
  }, [draft, permissions, allGranted, onDraftChange]);

  return (
    <div>
      <div className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors">
        <PageIndicator
          state={rowState}
          label={label}
          readOnly={readOnly}
          onClick={handleIndicatorClick}
        />
        {rowState === "unchecked" && !readOnly ? (
          <button
            type="button"
            onClick={handleLabelClick}
            aria-label={`Select ${label} at view level`}
            className="flex-1 min-w-0 truncate text-left text-sm font-medium text-foreground transition-colors hover:text-primary"
          >
            {label}
          </button>
        ) : (
          <span className="flex-1 min-w-0 truncate text-sm font-medium text-foreground">
            {label}
          </span>
        )}
        {grantedCount > 0 && (
          <Badge variant="secondary" className="text-[10px] shrink-0">
            {grantedCount}/{permissions.length}
          </Badge>
        )}
        {!readOnly && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleBulkToggle}
            className="h-6 px-2 text-[10px] text-muted-foreground shrink-0"
            aria-label={
              allGranted
                ? `Clear all ${label} permissions`
                : `Grant all ${label} permissions`
            }
          >
            {allGranted ? "Clear all" : "Select all"}
          </Button>
        )}
        <button
          type="button"
          onClick={handleToggleExpand}
          aria-expanded={expanded}
          aria-label={expanded ? `Collapse ${label}` : `Expand ${label}`}
          className="shrink-0 p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {expanded && (
        <div className="bg-muted/20 divide-y divide-border/50">
          {permissions.map((perm) => (
            <ActionRow
              key={perm.name}
              perm={perm}
              currentScope={draft[perm.name] ?? "none"}
              readOnly={readOnly}
              onCheck={handleActionCheck}
              onScopeChange={handleScopeChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function PageActionPicker({
  catalog,
  draft,
  onDraftChange,
  readOnly,
}: PageActionPickerProps) {
  const groups = useMemo(() => buildGroups(catalog), [catalog]);

  const grantedTotal = catalog.filter(
    (p) => (draft[p.name] ?? "none") !== "none",
  ).length;
  const allGranted = grantedTotal === catalog.length && catalog.length > 0;

  const handleModuleBulkToggle = useCallback(() => {
    const next = { ...draft };
    for (const p of catalog) {
      next[p.name] = allGranted ? "none" : "all";
    }
    onDraftChange(next);
  }, [draft, catalog, allGranted, onDraftChange]);

  const handleGroupDraftChange = useCallback(
    (next: PermDraft) => onDraftChange(next),
    [onDraftChange],
  );

  if (groups.length === 0) {
    return (
      <p className="text-sm text-muted-foreground px-5 py-4">
        No permissions in catalog.
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      {!readOnly && (
        <div className="flex items-center justify-between px-5 py-2 border-b border-border bg-muted/20">
          <span className="text-xs text-muted-foreground">
            {grantedTotal > 0
              ? `${grantedTotal} of ${catalog.length} granted`
              : `${catalog.length} permissions available`}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleModuleBulkToggle}
            className="h-6 px-2 text-[10px] text-muted-foreground"
            aria-label={
              allGranted ? "Clear all permissions" : "Grant all permissions"
            }
          >
            {allGranted ? "Clear all" : "Select all"}
          </Button>
        </div>
      )}
      <div className="divide-y divide-border">
        {groups.map((group) => (
          <ResourceRow
            key={group.resource}
            group={group}
            draft={draft}
            onDraftChange={handleGroupDraftChange}
            readOnly={readOnly}
          />
        ))}
      </div>
    </div>
  );
}
