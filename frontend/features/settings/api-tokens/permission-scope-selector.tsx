"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useGrantableUserApiTokenPermissions } from "@/hooks/api/user-api-tokens";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { TruncatedText } from "@/components/ui/truncated-text";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/get-error-message";

interface PermissionScopeSelectorProps {
  value: string[];
  onChange: (next: string[]) => void;
}

interface ScopeGroup {
  module: string;
  keys: { name: string; description: string }[];
}

const GROUP_LABELS: Readonly<Record<string, string>> = {
  accounting: "Accounting",
  ai: "AI",
  build: "Projects",
  crm: "CRM",
  hr: "HR",
  kb: "Knowledge Base",
  self: "My Account",
  support: "Support",
};

function moduleOf(permissionKey: string): string {
  return permissionKey.split(":")[0] ?? permissionKey;
}

export function PermissionScopeSelector({
  value,
  onChange,
}: PermissionScopeSelectorProps) {
  const { data, isLoading, isError, error, refetch } =
    useGrantableUserApiTokenPermissions();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 200);

  const selected = useMemo(() => new Set(value), [value]);

  useEffect(() => {
    if (!data) return;
    const available = new Set(data.map((permission) => permission.name));
    const valid = value.filter((permission) => available.has(permission));
    if (valid.length !== value.length) onChange(valid);
  }, [data, onChange, value]);

  const groups = useMemo<ScopeGroup[]>(() => {
    const term = debouncedSearch.trim().toLowerCase();
    const byModule = new Map<string, ScopeGroup["keys"]>();

    for (const permission of data ?? []) {
      if (term && !permission.name.toLowerCase().includes(term)) continue;
      const moduleKey = moduleOf(permission.name);
      const bucket = byModule.get(moduleKey);
      const entry = {
        name: permission.name,
        description: permission.description,
      };
      if (bucket) bucket.push(entry);
      else byModule.set(moduleKey, [entry]);
    }

    return [...byModule.entries()]
      .map(([moduleKey, keys]) => ({ module: moduleKey, keys }))
      .sort((a, b) => a.module.localeCompare(b.module));
  }, [data, debouncedSearch]);

  const handleToggle = useCallback(
    (permissionKey: string) => {
      onChange(
        selected.has(permissionKey)
          ? value.filter((key) => key !== permissionKey)
          : [...value, permissionKey],
      );
    },
    [onChange, selected, value],
  );

  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) =>
      setSearch(event.target.value),
    [],
  );

  const handleClear = useCallback(() => onChange([]), [onChange]);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (isError) {
    return (
      <ErrorState
        compact
        title="Couldn't load permissions"
        description={getErrorMessage(error)}
        onRetry={handleRetry}
      />
    );
  }

  return (
    <div className="min-w-0 w-full max-w-full space-y-2 pt-1">
      <div className="flex min-w-0 items-center gap-2">
        <Input
          value={search}
          onChange={handleSearchChange}
          placeholder="Search permissions…"
          className="min-w-0 flex-1"
        />
        <Badge variant="secondary" className="shrink-0">
          {value.length} selected
        </Badge>
        {value.length > 0 ? (
          <button
            type="button"
            onClick={handleClear}
            className="shrink-0 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Clear
          </button>
        ) : null}
      </div>

      <div className="h-64 w-full min-w-0 max-w-full overflow-x-hidden overflow-y-auto overscroll-contain rounded-lg border border-border">
        {isLoading ? (
          <div className="space-y-2 p-3">
            {Array.from({ length: 8 }, (_, index) => (
              <Skeleton key={index} className="h-5 w-full" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <p className="p-3 text-sm text-muted-foreground">
            No permissions match “{search}”.
          </p>
        ) : (
          <div className="min-w-0 w-full divide-y divide-border">
            {groups.map((group) => (
              <div key={group.module} className="min-w-0 p-3">
                <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {GROUP_LABELS[group.module] ?? group.module}
                </p>
                <div className="min-w-0 space-y-1.5">
                  {group.keys.map((permission) => (
                    <ScopeRow
                      key={permission.name}
                      name={permission.name}
                      description={permission.description}
                      checked={selected.has(permission.name)}
                      onToggle={handleToggle}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface ScopeRowProps {
  name: string;
  description: string;
  checked: boolean;
  onToggle: (permissionKey: string) => void;
}

function ScopeRow({ name, description, checked, onToggle }: ScopeRowProps) {
  function handleChange() {
    onToggle(name);
  }

  return (
    <label className="flex w-full min-w-0 cursor-pointer items-start gap-2 overflow-hidden rounded-md px-1 py-1 hover:bg-muted/60">
      <Checkbox
        checked={checked}
        onCheckedChange={handleChange}
        className="mt-0.5 shrink-0"
      />
      <span className="min-w-0 flex-1 overflow-hidden">
        <TruncatedText
          text={name}
          className="font-mono text-xs text-foreground"
        />
        {description ? (
          <TruncatedText
            text={description}
            lines={2}
            className="text-xs text-muted-foreground"
          />
        ) : null}
      </span>
    </label>
  );
}
