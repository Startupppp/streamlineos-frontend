"use client";

import { useCallback } from "react";
import { ChevronDown, ChevronRight, Lock } from "lucide-react";
import { TruncatedText } from "@/components/ui/truncated-text";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Permission } from "@/lib/rbac/permissions";
import {
  type EditableScope,
  type ScopeMap,
  type CatalogModule,
  SCOPE_LABELS,
  SCOPE_OPTIONS,
  isScopable,
  isEditableScope,
} from "./permission-matrix-types";

export interface PermissionRowProps {
  perm: Permission;
  enabled: boolean;
  scope: EditableScope;
  scopable: boolean;
  disabled: boolean;
  readOnly: boolean;
  included: boolean;
  onToggle: (permName: string) => void;
  onSetScope: (permName: string, scope: EditableScope) => void;
}

export function PermissionRow({
  perm,
  enabled,
  scope,
  scopable,
  disabled,
  readOnly,
  included,
  onToggle,
  onSetScope,
}: PermissionRowProps) {
  const handleToggle = useCallback(
    () => onToggle(perm.name),
    [perm.name, onToggle],
  );
  const handleScopeChange = useCallback(
    (value: string) => {
      if (isEditableScope(value)) onSetScope(perm.name, value);
    },
    [perm.name, onSetScope],
  );

  return (
    <div className="flex items-center justify-between gap-3 px-4 pl-9 py-2 hover:bg-muted/20 transition-colors">
      <label
        className={
          disabled
            ? "flex min-w-0 cursor-default items-start gap-2.5"
            : "flex min-w-0 cursor-pointer items-start gap-2.5"
        }
      >
        <Checkbox
          checked={enabled}
          onCheckedChange={handleToggle}
          disabled={disabled}
          className="mt-0.5"
          aria-label={perm.description}
        />
        <span className="min-w-0">
          <span className="flex min-w-0 items-center gap-2">
            <TruncatedText
              text={perm.description}
              className="block text-label leading-tight"
            />
            {included ? (
              <Badge
                variant="outline"
                className="h-5 shrink-0 px-2 py-0.5 text-micro"
              >
                Included
              </Badge>
            ) : null}
          </span>
          <span className="block text-micro text-muted-foreground font-mono truncate">
            {perm.name}
          </span>
        </span>
      </label>
      {scopable && enabled ? (
        readOnly || included ? (
          <Badge variant="outline" className="text-micro shrink-0">
            {SCOPE_LABELS[scope]}
          </Badge>
        ) : (
          <Select value={scope} onValueChange={handleScopeChange}>
            <SelectTrigger size="sm" className="w-[116px] shrink-0 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
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
        )
      ) : (
        <span className="w-[116px] shrink-0" aria-hidden="true" />
      )}
    </div>
  );
}

export interface ModuleSectionProps {
  module: CatalogModule;
  effective: ScopeMap;
  expanded: boolean;
  locked: boolean;
  readOnly: boolean;
  onToggleExpand: (moduleKey: string) => void;
  onToggleModule: (moduleKey: string, enable: boolean) => void;
  onTogglePermission: (permName: string) => void;
  onSetScope: (permName: string, scope: EditableScope) => void;
}

export function ModuleSection({
  module,
  effective,
  expanded,
  locked,
  readOnly,
  onToggleExpand,
  onToggleModule,
  onTogglePermission,
  onSetScope,
}: ModuleSectionProps) {
  const enabledCount = module.perms.filter(
    (perm) => effective[perm.name],
  ).length;
  const allEnabled =
    enabledCount === module.perms.length && module.perms.length > 0;
  const controlsDisabled = locked || readOnly;

  const handleToggleExpand = useCallback(
    () => onToggleExpand(module.moduleKey),
    [module.moduleKey, onToggleExpand],
  );
  const handleToggleModule = useCallback(
    () => onToggleModule(module.moduleKey, !allEnabled),
    [module.moduleKey, allEnabled, onToggleModule],
  );

  return (
    <div>
      <div className="flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-muted/30 transition-colors">
        <button
          type="button"
          onClick={handleToggleExpand}
          className="flex items-center gap-2 min-w-0 flex-1 text-left"
          aria-expanded={expanded}
        >
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          )}
          <TruncatedText text={module.label} className="text-sm font-medium" />
          <Badge variant="outline" className="text-micro px-1.5 py-0 shrink-0">
            {enabledCount}/{module.perms.length}
          </Badge>
          {locked && (
            <Badge
              variant="outline"
              className="text-micro px-1.5 py-0 shrink-0 gap-1 text-muted-foreground"
            >
              <Lock className="h-3 w-3" /> Not in plan
            </Badge>
          )}
        </button>
        <Checkbox
          checked={allEnabled}
          onCheckedChange={handleToggleModule}
          disabled={controlsDisabled}
          aria-label={`Toggle all ${module.label} permissions`}
        />
      </div>
      {expanded && (
        <div className="bg-muted/10 border-t border-border/20 pb-1">
          {module.resources.map((resource) => (
            <div key={resource.resource}>
              <p className="px-4 pt-2 pb-1 text-micro font-semibold uppercase tracking-wide text-muted-foreground">
                {resource.label}
              </p>
              {resource.perms.map((perm) => {
                const scope = effective[perm.name];
                const included = Boolean(perm.baselineScope);
                return (
                  <PermissionRow
                    key={perm.name}
                    perm={perm}
                    enabled={Boolean(scope)}
                    scope={scope ?? "all"}
                    scopable={isScopable(perm)}
                    disabled={controlsDisabled || included}
                    readOnly={readOnly}
                    included={included}
                    onToggle={onTogglePermission}
                    onSetScope={onSetScope}
                  />
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
