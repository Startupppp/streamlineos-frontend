"use client";

import { useCallback, useMemo, useState } from "react";
import { usePermissionCatalog } from "@/hooks/api/access";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
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

function moduleOf(permissionKey: string): string {
  return permissionKey.split(":")[0] ?? permissionKey;
}

export function PermissionScopeSelector({
  value,
  onChange,
}: PermissionScopeSelectorProps) {
  const { data, isLoading, isError, error, refetch } = usePermissionCatalog();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 200);

  const selected = useMemo(() => new Set(value), [value]);

  const groups = useMemo<ScopeGroup[]>(() => {
    const term = debouncedSearch.trim().toLowerCase();
    const byModule = new Map<string, ScopeGroup["keys"]>();

    for (const permission of data ?? []) {
      if (term && !permission.name.toLowerCase().includes(term)) continue;
      const module = moduleOf(permission.name);
      const bucket = byModule.get(module);
      const entry = {
        name: permission.name,
        description: permission.description,
      };
      if (bucket) bucket.push(entry);
      else byModule.set(module, [entry]);
    }

    return [...byModule.entries()]
      .map(([module, keys]) => ({ module, keys }))
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
    <div className="space-y-2 pt-1">
      <div className="flex items-center gap-2">
        <Input
          value={search}
          onChange={handleSearchChange}
          placeholder="Search permissions…"
          className="h-8 flex-1"
        />
        <Badge variant="secondary">{value.length} selected</Badge>
        {value.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Clear
          </button>
        )}
      </div>

      <ScrollArea className="h-64 rounded-lg border border-border">
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
          <div className="divide-y divide-border">
            {groups.map((group) => (
              <div key={group.module} className="p-3">
                <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {group.module}
                </p>
                <div className="space-y-1.5">
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
      </ScrollArea>
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
    <label className="flex cursor-pointer items-start gap-2 rounded-md px-1 py-1 hover:bg-muted/60">
      <Checkbox
        checked={checked}
        onCheckedChange={handleChange}
        className="mt-0.5"
      />
      <span className="min-w-0">
        <span className="block truncate font-mono text-xs text-foreground">
          {name}
        </span>
        {description && (
          <span className="block truncate text-xs text-muted-foreground">
            {description}
          </span>
        )}
      </span>
    </label>
  );
}
