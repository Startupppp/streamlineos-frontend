"use client";

import { memo, useCallback, useMemo } from "react";
import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/get-error-message";
import { usePayrollComponents } from "@/hooks/api/payroll/components";
import type { SalaryComponentListItem } from "@/hooks/api/payroll/components-schema";
import { componentRole, duplicatedRoles } from "@/features/payroll/components/lib/component-role";
import { ProfileTemplatePicker } from "./profile-template-picker";

interface ProfileComponentsFieldProps {
  value: readonly number[];
  onChange: (next: number[]) => void;
}

interface ComponentOptionProps {
  component: SalaryComponentListItem;
  checked: boolean;
  onToggle: (componentId: number, checked: boolean) => void;
}

const ComponentOption = memo(function ComponentOption({ component, checked, onToggle }: ComponentOptionProps) {
  const id = `profile-component-${component.id}`;
  const role = componentRole(component);

  function handleCheckedChange(next: boolean | "indeterminate") {
    onToggle(component.id, next === true);
  }

  return (
    <li className="flex items-center gap-2">
      <Checkbox id={id} checked={checked} onCheckedChange={handleCheckedChange} />
      <label htmlFor={id} className="flex min-w-0 flex-1 items-center justify-between gap-2 text-xs">
        <span className="truncate text-foreground">
          {component.name} <span className="font-mono text-muted-foreground">{component.code}</span>
        </span>
        {role ? <span className="shrink-0 text-muted-foreground">{role}</span> : null}
      </label>
    </li>
  );
});

export function ProfileComponentsField({ value, onChange }: ProfileComponentsFieldProps) {
  const { data, isLoading, isError, error } = usePayrollComponents({ active: true, limit: 100 });
  const items = useMemo(() => data?.items ?? [], [data]);
  const selected = useMemo(() => new Set(value), [value]);
  const duplicates = useMemo(
    () => [...duplicatedRoles(items.filter((item) => selected.has(item.id)))],
    [items, selected],
  );

  const handleToggle = useCallback(
    (componentId: number, checked: boolean) => {
      onChange(checked ? [...value, componentId] : value.filter((id) => id !== componentId));
    },
    [onChange, value],
  );

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    );
  }
  if (isError) return <p className="text-xs text-destructive">{getErrorMessage(error)}</p>;
  if (items.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No active components yet. Add them in the{" "}
        <Link href="/payroll/components" className="underline underline-offset-2">component catalog</Link>.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <ProfileTemplatePicker components={items} onApply={onChange} />
      <ul className="max-h-56 space-y-1.5 overflow-y-auto rounded-md border border-border p-2">
        {items.map((component) => (
          <ComponentOption
            key={component.id}
            component={component}
            checked={selected.has(component.id)}
            onToggle={handleToggle}
          />
        ))}
      </ul>
      {duplicates.length > 0 ? (
        <p className="text-xs text-destructive">
          {duplicates.join(", ")} {duplicates.length === 1 ? "is" : "are"} selected more than once. Payroll pays every selected line, so keep one per role.
        </p>
      ) : null}
      {data?.pagination.hasMore ? (
        <p className="text-micro text-muted-foreground">Showing the first 100 active components.</p>
      ) : null}
    </div>
  );
}
