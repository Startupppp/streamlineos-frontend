"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PenTool, Check } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getErrorMessage } from "@/lib/get-error-message";
import { useSetSignFieldValue } from "@/hooks/api/sign/public";
import type { SignField } from "@/types/sign";
import { SignaturePadDialog } from "./signature-pad-dialog";

interface PublicFieldOverlayProps {
  token: string;
  field: SignField;
  scale: number;
  isNextRequired: boolean;
}

function fieldValueString(field: SignField): string {
  const value = (field.valueJson as { value?: unknown } | null)?.value;
  return typeof value === "string" ? value : "";
}

export function PublicFieldOverlay({ token, field, scale, isNextRequired }: PublicFieldOverlayProps) {
  const [padOpen, setPadOpen] = useState(false);
  const [localValue, setLocalValue] = useState(fieldValueString(field));
  const setFieldValue = useSetSignFieldValue(token);
  const isSignatureLike = field.fieldType === "signature" || field.fieldType === "initials";
  const isFilled = Boolean(field.completedAt);

  const style = {
    left: field.x * scale,
    top: field.y * scale,
    width: field.width * scale,
    height: field.height * scale,
  };

  async function saveValue(value: string | boolean) {
    try {
      await setFieldValue.mutateAsync({ fieldId: field.id, value });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  function handleTextBlur(): void {
    if (localValue === fieldValueString(field)) return;
    void saveValue(localValue);
  }

  const baseClass = `absolute flex items-center justify-center rounded border-2 text-xs font-medium transition-colors ${
    isFilled ? "border-status-success-rule bg-status-success-surface text-status-success-ink" : isNextRequired ? "border-primary bg-primary/10 animate-pulse" : "border-dashed border-muted-foreground/40 bg-muted/40 text-muted-foreground"
  }`;

  if (field.fieldType === "date_signed") {
    return (
      <div style={style} className={baseClass}>
        <span className="truncate px-1">{isFilled ? fieldValueString(field) : "Date (auto)"}</span>
      </div>
    );
  }

  if (field.fieldType === "readonly_merge") {
    return (
      <div style={style} className="absolute flex items-center px-1 text-xs text-foreground">
        {field.defaultValue}
      </div>
    );
  }

  if (isSignatureLike) {
    return (
      <>
        <button type="button" style={style} className={`${baseClass} cursor-pointer`} onClick={() => setPadOpen(true)}>
          {isFilled ? (
            <span className="flex items-center gap-1">
              <Check className="size-3.5" /> Signed
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <PenTool className="size-3.5" /> Click to {field.fieldType === "initials" ? "initial" : "sign"}
            </span>
          )}
        </button>
        <SignaturePadDialog
          token={token}
          assetType={field.fieldType === "initials" ? "initials" : "signature"}
          open={padOpen}
          onOpenChange={setPadOpen}
          onAdopted={() => setLocalValue("signed")}
        />
      </>
    );
  }

  if (field.fieldType === "checkbox") {
    return (
      <button
        type="button"
        style={style}
        className={baseClass}
        onClick={() => saveValue(!isFilled)}
      >
        {isFilled && <Check className="size-4" />}
      </button>
    );
  }

  if (field.fieldType === "dropdown" || field.fieldType === "radio") {
    return (
      <div style={style} className="absolute">
        <Select
          value={localValue || undefined}
          onValueChange={(value) => {
            setLocalValue(value);
            void saveValue(value);
          }}
        >
          <SelectTrigger className={`h-full w-full text-xs ${isFilled ? "border-status-success-rule" : "border-dashed"}`}>
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent>
            {(field.optionsJson ?? []).map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <input
      style={style}
      className={`absolute rounded border-2 px-2 text-xs outline-none ${
        isFilled ? "border-status-success-rule bg-status-success-surface" : "border-primary/50 bg-white/90 dark:bg-black/40"
      }`}
      value={localValue}
      placeholder={field.label ?? undefined}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleTextBlur}
    />
  );
}
