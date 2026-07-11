"use client";

import { useCallback } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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

export interface ScopeRow {
  scopeType: HrPolicyScopeType;
  scopeValue: string;
}

interface Props {
  value: Array<{ scopeType: string; scopeValue: string }>;
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
            onValueChange={(v) => handleTypeChange(index, v as HrPolicyScopeType)}
            disabled={disabled}
          >
            <SelectTrigger className="h-8 text-xs w-44 shrink-0">
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
            className="h-8 text-xs flex-1"
            disabled={disabled || row.scopeType === "organization"}
            readOnly={row.scopeType === "organization"}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => handleRemove(index)}
            disabled={disabled || value.length === 1}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 text-xs gap-1"
        onClick={handleAdd}
        disabled={disabled}
      >
        <Plus className="h-3 w-3" />
        Add Scope
      </Button>
    </div>
  );
}
