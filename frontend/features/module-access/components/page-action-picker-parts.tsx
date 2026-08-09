"use client";

import { useCallback } from "react";
import { Check, Minus, Eye } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { ModulePermission, DataScope } from "@/hooks/api/module-access";

export type PermDraft = Record<string, DataScope>;
export type RowState = "unchecked" | "view-only" | "partial" | "full";

export interface ResourceGroup {
  resource: string;
  permissions: ModulePermission[];
}

const SCOPE_OPTIONS: { value: DataScope; label: string }[] = [
  { value: "all", label: "All" },
  { value: "team", label: "Team" },
  { value: "own", label: "Own" },
];

export const ROW_STATE_LABELS: Record<RowState, string> = {
  unchecked: "no access",
  "view-only": "view only",
  partial: "partial access",
  full: "full access",
};

export function parseScope(v: string): DataScope | null {
  if (v === "all" || v === "team" || v === "own" || v === "none") return v;
  return null;
}

export function buildGroups(catalog: ModulePermission[]): ResourceGroup[] {
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

export function resourceLabel(resource: string): string {
  return resource
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function deriveRowState(
  permissions: ModulePermission[],
  draft: PermDraft,
  viewPerm: ModulePermission | undefined,
): RowState {
  const grantedCount = permissions.filter(
    (p) => (draft[p.name] ?? "none") !== "none",
  ).length;
  if (grantedCount === 0) return "unchecked";
  if (grantedCount === permissions.length) return "full";
  if (
    viewPerm !== undefined &&
    grantedCount === 1 &&
    (draft[viewPerm.name] ?? "none") !== "none"
  ) {
    return "view-only";
  }
  return "partial";
}

export interface PageIndicatorProps {
  state: RowState;
  label: string;
  readOnly: boolean;
  onClick: () => void;
}

export function PageIndicator({
  state,
  label,
  readOnly,
  onClick,
}: PageIndicatorProps) {
  const ariaChecked: boolean | "mixed" =
    state === "full" ? true : state === "unchecked" ? false : "mixed";
  const className = cn(
    "h-4 w-4 shrink-0 rounded-sm border-2 flex items-center justify-center transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
    state === "unchecked" && "border-input bg-background",
    state === "view-only" &&
      "border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
    state === "partial" && "border-primary bg-primary/10 text-primary",
    state === "full" && "border-primary bg-primary text-primary-foreground",
  );
  const indicator = (
    <>
      {state === "full" ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : null}
      {state === "partial" ? <Minus className="h-2.5 w-2.5" strokeWidth={3} /> : null}
      {state === "view-only" ? <Eye className="h-2.5 w-2.5" /> : null}
    </>
  );

  if (readOnly) {
    return (
      <span aria-label={`${label} - ${ROW_STATE_LABELS[state]}`} className={className}>
        {indicator}
      </span>
    );
  }

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={ariaChecked}
      aria-label={`${label} - ${ROW_STATE_LABELS[state]}`}
      onClick={onClick}
      className={className}
    >
      {indicator}
    </button>
  );
}

export interface ActionRowProps {
  perm: ModulePermission;
  currentScope: DataScope;
  readOnly: boolean;
  onCheck: (permName: string, checked: boolean) => void;
  onScopeChange: (permName: string, scope: DataScope) => void;
}

export function ActionRow({
  perm,
  currentScope,
  readOnly,
  onCheck,
  onScopeChange,
}: ActionRowProps) {
  const isGranted = currentScope !== "none";
  const scopeLabel = SCOPE_OPTIONS.find(
    (option) => option.value === currentScope,
  )?.label;

  const handleCheck = useCallback(
    (v: boolean | "indeterminate") => onCheck(perm.name, v === true),
    [perm.name, onCheck],
  );

  const handleScope = useCallback(
    (v: string) => {
      const scope = parseScope(v);
      if (scope) onScopeChange(perm.name, scope);
    },
    [perm.name, onScopeChange],
  );

  const label = (
    <>
      <span className="text-sm text-foreground capitalize">{perm.action}</span>
      {perm.description ? (
        <span className="ml-1.5 text-xs text-muted-foreground">
          - {perm.description}
        </span>
      ) : null}
    </>
  );

  return (
    <div className="flex items-center gap-3 pl-12 pr-5 py-2.5">
      {readOnly ? (
        <span
          aria-hidden="true"
          className={cn(
            "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border",
            isGranted
              ? "border-primary bg-primary text-primary-foreground"
              : "border-input bg-background",
          )}
        >
          {isGranted ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : null}
        </span>
      ) : (
        <Checkbox
          id={`action-${perm.name}`}
          checked={isGranted}
          onCheckedChange={handleCheck}
          aria-label={`Grant ${perm.action}`}
        />
      )}

      {readOnly ? (
        <span className="flex-1 min-w-0 select-none">{label}</span>
      ) : (
        <label
          htmlFor={`action-${perm.name}`}
          className="flex-1 min-w-0 cursor-pointer select-none"
        >
          {label}
        </label>
      )}

      {readOnly ? (
        <span className="w-24 shrink-0 text-right text-xs text-muted-foreground">
          {isGranted
            ? perm.scopable && scopeLabel
              ? scopeLabel
              : "Granted"
            : "Not granted"}
        </span>
      ) : perm.scopable && isGranted ? (
        <Select value={currentScope} onValueChange={handleScope}>
          <SelectTrigger className="w-24 text-xs border-input bg-card shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
            {SCOPE_OPTIONS.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                className="text-xs"
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : isGranted ? (
        <span className="w-24 shrink-0 text-right text-xs text-muted-foreground">
          Granted
        </span>
      ) : null}
    </div>
  );
}
