"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useCustomFields } from "@/hooks/api/crm/custom-fields";
import type { CustomFieldDefinition } from "@/hooks/api/crm/custom-fields";

interface CustomFieldsSectionProps {
  entityType: "lead" | "deal" | "contact";
  values: Record<string, unknown>;
  className?: string;
}

export function CustomFieldsSection({ entityType, values, className }: CustomFieldsSectionProps) {
  const { data, isLoading, isError, refetch } = useCustomFields(entityType);
  const fields = data?.fields ?? [];
  const activeFields = fields.filter((f) => f.isActive);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Failed to load custom fields.</span>
        <button
          type="button"
          onClick={() => void refetch()}
          className="text-xs text-blue-500 hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (activeFields.length === 0) return null;

  return (
    <div className={className}>
      <h3 className="text-sm font-semibold text-slate-700 mb-3">Custom Fields</h3>
      <div className="space-y-1.5">
        {activeFields.map((field) => (
          <div key={field.id} className="flex items-center justify-between py-1 border-b border-border/30 last:border-0">
            <span className="text-sm text-muted-foreground">{field.label}</span>
            <span className="text-sm font-medium text-foreground">
              {formatCustomFieldValue(values[field.name], field)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatCustomFieldValue(value: unknown, field: CustomFieldDefinition): string {
  if (value === null || value === undefined || value === "") return "—";
  if (field.fieldType === "boolean") return value ? "Yes" : "No";
  if (field.fieldType === "date" && typeof value === "string") {
    try {
      return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    } catch {
      return String(value);
    }
  }
  if (field.fieldType === "select" && typeof value === "string") {
    const option = field.options?.find((o) => o.value === value);
    return option?.label ?? value;
  }
  if (field.fieldType === "number" && typeof value === "number") {
    return value.toLocaleString("en-IN");
  }
  return String(value);
}
