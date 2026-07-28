"use client";

import { useState, useCallback, useMemo } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { ModulePermission, DataScope } from "@/hooks/api/module-access";

type PermDraft = Record<string, DataScope>;

export interface PageActionPickerProps {
  catalog: ModulePermission[];
  draft: PermDraft;
  onDraftChange: (next: PermDraft) => void;
  readOnly: boolean;
}

interface ResourceGroup {
  resource: string;
  permissions: ModulePermission[];
}

const SCOPE_OPTIONS: { value: DataScope; label: string }[] = [
  { value: "all", label: "All" },
  { value: "team", label: "Team" },
  { value: "own", label: "Own" },
];

function buildGroups(catalog: ModulePermission[]): ResourceGroup[] {
  const map = new Map<string, ModulePermission[]>();
  for (const perm of catalog) {
    const existing = map.get(perm.resource) ?? [];
    map.set(perm.resource, [...existing, perm]);
  }
  return Array.from(map.entries()).map(([resource, permissions]) => ({
    resource,
    permissions,
  }));
}

function resourceLabel(resource: string): string {
  return resource
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
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
  const grantedKeys = permissions.filter(
    (p) => (draft[p.name] ?? "none") !== "none",
  );
  const isAnyGranted = grantedKeys.length > 0;
  const isAllGranted = grantedKeys.length === permissions.length;
  const isIndeterminate = isAnyGranted && !isAllGranted;

  const handlePageCheck = useCallback(
    (checked: boolean) => {
      const next = { ...draft };
      if (checked) {
        const target = viewPerm ?? permissions[0];
        if (target) next[target.name] = "all";
      } else {
        for (const p of permissions) {
          next[p.name] = "none";
        }
      }
      onDraftChange(next);
    },
    [draft, permissions, viewPerm, onDraftChange],
  );

  const handleActionCheck = useCallback(
    (permName: string, checked: boolean) => {
      onDraftChange({ ...draft, [permName]: checked ? "all" : "none" });
    },
    [draft, onDraftChange],
  );

  const handleScopeChange = useCallback(
    (permName: string, scope: DataScope) => {
      onDraftChange({ ...draft, [permName]: scope });
    },
    [draft, onDraftChange],
  );

  const handleToggleExpand = useCallback(() => setExpanded((v) => !v), []);

  return (
    <div className="border-b border-border last:border-0">
      <div className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors">
        <Checkbox
          id={`page-${resource}`}
          checked={isIndeterminate ? "indeterminate" : isAnyGranted}
          onCheckedChange={(v) => handlePageCheck(v === true)}
          disabled={readOnly}
          aria-label={`Grant access to ${resourceLabel(resource)}`}
        />
        <button
          type="button"
          onClick={handleToggleExpand}
          className="flex flex-1 items-center gap-2 text-left min-w-0"
          aria-expanded={expanded}
        >
          <span className="text-sm font-medium text-foreground min-w-0 truncate">
            {resourceLabel(resource)}
          </span>
          {isAnyGranted && (
            <Badge variant="secondary" className="text-[10px] shrink-0">
              {grantedKeys.length}/{permissions.length}
            </Badge>
          )}
          <span className="ml-auto shrink-0 text-muted-foreground">
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </span>
        </button>
      </div>

      {expanded && (
        <div className="bg-muted/20 divide-y divide-border/50">
          {permissions.map((perm) => {
            const currentScope = draft[perm.name] ?? "none";
            const isGranted = currentScope !== "none";
            return (
              <div
                key={perm.name}
                className="flex items-center gap-3 pl-12 pr-5 py-2.5"
              >
                <Checkbox
                  id={`action-${perm.name}`}
                  checked={isGranted}
                  onCheckedChange={(v) =>
                    handleActionCheck(perm.name, v === true)
                  }
                  disabled={readOnly}
                  aria-label={`Grant ${perm.action}`}
                />
                <label
                  htmlFor={`action-${perm.name}`}
                  className="flex-1 min-w-0 cursor-pointer select-none"
                >
                  <span className="text-sm text-foreground capitalize">
                    {perm.action}
                  </span>
                  {perm.description && (
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      — {perm.description}
                    </span>
                  )}
                </label>
                {perm.scopable && isGranted ? (
                  <Select
                    value={currentScope as string}
                    onValueChange={(v) =>
                      handleScopeChange(perm.name, v as DataScope)
                    }
                    disabled={readOnly}
                  >
                    <SelectTrigger className="h-7 w-24 text-xs border-input bg-card shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                      {SCOPE_OPTIONS.map((o) => (
                        <SelectItem
                          key={o.value}
                          value={o.value}
                          className="text-xs"
                        >
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : isGranted ? (
                  <span className="text-xs text-muted-foreground w-24 text-right shrink-0">
                    Granted
                  </span>
                ) : null}
              </div>
            );
          })}
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
    <div
      className={cn(
        "divide-y divide-border rounded-lg border border-border bg-card",
        readOnly && "opacity-60 pointer-events-none",
      )}
    >
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
  );
}
