"use client";

import { useCallback } from "react";

const AVAILABLE_SCOPES = [
  "read:all",
  "write:all",
  "read:org",
  "write:org",
  "read:hr",
  "write:hr",
  "read:crm",
  "write:crm",
  "read:projects",
  "write:projects",
];

interface ScopeSelectorProps {
  value: string[];
  onChange: (v: string[]) => void;
}

export function ScopeSelector({ value, onChange }: ScopeSelectorProps) {
  const handleToggle = useCallback(
    (scope: string) => {
      if (value.includes(scope)) {
        onChange(value.filter((s) => s !== scope));
      } else {
        onChange([...value, scope]);
      }
    },
    [value, onChange],
  );

  return (
    <div className="flex flex-wrap gap-2 pt-1">
      {AVAILABLE_SCOPES.map((scope) => (
        <ScopeChip
          key={scope}
          scope={scope}
          selected={value.includes(scope)}
          onToggle={handleToggle}
        />
      ))}
    </div>
  );
}

function ScopeChip({
  scope,
  selected,
  onToggle,
}: {
  scope: string;
  selected: boolean;
  onToggle: (s: string) => void;
}) {
  function handleClick() {
    onToggle(scope);
  }
  return (
    <button
      type="button"
      onClick={handleClick}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-muted text-muted-foreground hover:bg-muted/80"
      }`}
    >
      {scope}
    </button>
  );
}
