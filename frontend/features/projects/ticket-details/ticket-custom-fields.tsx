"use client";

import { memo, useMemo, useState, useCallback } from "react";
import {
  useProjectCustomFields,
  useTicketCustomFieldValues,
  useUpsertTicketCustomFieldValues,
} from "@/hooks/api/projects/custom-fields";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { Sliders } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ProjectCustomField } from "@/types/projects/tasks";

interface TicketCustomFieldsProps {
  projectId: number;
  ticketId: number;
}

interface FieldValueInputProps {
  field: ProjectCustomField;
  currentValue: string | null;
  onSave: (fieldId: number, value: string | null) => void;
}

const FieldValueInput = memo(function FieldValueInput({ field, currentValue, onSave }: FieldValueInputProps) {
  const [localValue, setLocalValue] = useState(currentValue ?? "");

  const handleBlurSave = useCallback(() => {
    onSave(field.id, localValue || null);
  }, [field.id, localValue, onSave]);

  const handleDateChange = useCallback(
    (value: string) => {
      setLocalValue(value);
      onSave(field.id, value || null);
    },
    [field.id, onSave],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setLocalValue(e.target.value);
    },
    [],
  );

  if (field.type === "checkbox") {
    return (
      <Switch
        checked={currentValue === "true"}
        onCheckedChange={(checked) => onSave(field.id, String(checked))}
        className="h-4 w-7"
      />
    );
  }

  if (field.type === "select" && field.options?.length) {
    return (
      <Select
        value={currentValue ?? ""}
        onValueChange={(v) => onSave(field.id, v)}
      >
        <SelectTrigger className="text-xs border-0 bg-muted hover:bg-accent w-auto min-w-[120px]">
          <SelectValue placeholder="Select..." />
        </SelectTrigger>
        <SelectContent>
          {field.options.map((opt) => (
            <SelectItem key={opt} value={opt} className="text-xs">
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (field.type === "date") {
    return (
      <DatePicker
        value={localValue}
        onChange={handleDateChange}
        placeholder="Pick a date"
        className="text-xs w-36"
      />
    );
  }

  const inputType =
    field.type === "number"
      ? "number"
      : field.type === "url"
        ? "url"
        : "text";

  return (
    <Input
      type={inputType}
      value={localValue}
      onChange={handleInputChange}
      onBlur={handleBlurSave}
      placeholder={field.type === "currency" ? "0.00" : "Enter value..."}
      className="text-xs border-0 bg-muted hover:bg-accent focus:bg-background max-w-[200px]"
    />
  );
});

export function TicketCustomFields({
  projectId,
  ticketId,
}: TicketCustomFieldsProps) {
  const { data: fields = [], isLoading: loadingFields } =
    useProjectCustomFields(projectId);
  const { data: values = [], isLoading: loadingValues } =
    useTicketCustomFieldValues(projectId, ticketId);
  const upsert = useUpsertTicketCustomFieldValues(projectId, ticketId);

  const valueMap = useMemo(() => new Map(values.map((v) => [v.fieldId, v.value])), [values]);

  const handleSave = useCallback(
    (fieldId: number, value: string | null) => {
      upsert.mutate([{ fieldId, value }], {
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    },
    [upsert],
  );

  if (loadingFields || loadingValues) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
      </div>
    );
  }

  if (fields.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
        <Sliders className="h-3.5 w-3.5" />
        <span>No custom fields.</span>
        <Link
          href={`/projects/${projectId}/settings`}
          className="text-primary hover:underline"
        >
          Configure in Settings
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h4 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        Custom Fields
      </h4>
      {fields.map((field) => (
        <div key={field.id} className="flex items-center gap-3 py-0.5">
          <Label
            className={cn(
              "text-xs text-muted-foreground w-28 shrink-0 truncate",
              field.required &&
                "after:content-['*'] after:text-red-400 after:ml-0.5",
            )}
            title={field.name}
          >
            {field.name}
          </Label>
          <FieldValueInput
            field={field}
            currentValue={valueMap.get(field.id) ?? null}
            onSave={handleSave}
          />
        </div>
      ))}
    </div>
  );
}
