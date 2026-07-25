"use client";

import { useCallback } from "react";
import { PlusIcon, XIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HR_SCOPE_TYPES, SCOPE_TYPE_LABELS } from "@/types/hr/policies";
import type { HrPolicyScopeType } from "@/types/hr/policies";

function isScopeType(v: string): v is HrPolicyScopeType {
  return (HR_SCOPE_TYPES as readonly string[]).includes(v);
}

export interface ScopeRow {
  scopeType: HrPolicyScopeType;
  scopeValue: string;
}

interface Props {
  value: ScopeRow[];
  onChange: (scopes: ScopeRow[]) => void;
  disabled?: boolean;
}

export function PolicyScopesEditor({ value, onChange, disabled }: Props) {
  const handleAdd = useCallback(() => {
    onChange([...value, { scopeType: "organization", scopeValue: "" }]);
  }, [value, onChange]);

  const handleRemove = useCallback(
    (index: number) => {
      onChange(value.filter((_, i) => i !== index));
    },
    [value, onChange],
  );

  const handleTypeChange = useCallback(
    (index: number, scopeType: HrPolicyScopeType) => {
      const next = value.map((row, i) =>
        i === index ? { ...row, scopeType } : row,
      );
      onChange(next);
    },
    [value, onChange],
  );

  const handleValueChange = useCallback(
    (index: number, scopeValue: string) => {
      const next = value.map((row, i) =>
        i === index ? { ...row, scopeValue } : row,
      );
      onChange(next);
    },
    [value, onChange],
  );

  return (
    <div className="space-y-2">
      {value.map((row, index) => (
        <div key={index} className="flex items-center gap-2">
          <Select
            value={row.scopeType}
            onValueChange={(v) => { if (isScopeType(v)) handleTypeChange(index, v); }}
            disabled={disabled}
          >
            <SelectTrigger className="w-44 shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HR_SCOPE_TYPES.map((t) => (
                <SelectItem key={t} value={t} className="text-xs">
                  {SCOPE_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={row.scopeType === "organization" ? "(all)" : row.scopeValue}
            onChange={(e) => handleValueChange(index, e.target.value)}
            placeholder={
              row.scopeType === "organization"
                ? "Applies to entire org"
                : `Enter ${SCOPE_TYPE_LABELS[row.scopeType]} ID/code`
            }
            className="text-xs flex-1"
            disabled={disabled || row.scopeType === "organization"}
            readOnly={row.scopeType === "organization"}
          />
          <AnimatedIconButton
            icon={XIcon}
            iconSize={14}
            type="button"
            variant="ghost"
            size="icon"
            className="w-8 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => handleRemove(index)}
            disabled={disabled || value.length === 1}
            aria-label="Remove scope"
          />
        </div>
      ))}
      <AnimatedIconButton
        icon={PlusIcon}
        iconSize={12}
        iconClassName="mr-1"
        type="button"
        variant="outline"
        size="sm"
        className="text-xs gap-1"
        onClick={handleAdd}
        disabled={disabled}
      >
        Add Scope
      </AnimatedIconButton>
    </div>
  );
}
