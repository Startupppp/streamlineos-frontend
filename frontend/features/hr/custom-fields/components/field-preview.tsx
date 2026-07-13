"use client";

import { Badge } from "@/components/ui/badge";
import { Lock } from "lucide-react";

interface FieldPreviewProps {
  name: string;
  fieldType: string;
  helpText?: string;
  placeholder?: string;
  isRequired: boolean;
  isSensitive: boolean;
  options?: { label: string; value: string }[];
}

export function FieldPreview({
  name,
  fieldType,
  helpText,
  placeholder,
  isRequired,
  isSensitive,
  options,
}: FieldPreviewProps) {
  return (
    <div className="p-3 border rounded-md bg-muted/30 space-y-1.5">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-sm font-medium">{name || "Untitled"}</span>
        {isRequired && (
          <Badge variant="outline" className="text-[10px] h-4 px-1 text-primary border-primary/30">
            required
          </Badge>
        )}
        {isSensitive && (
          <Badge variant="outline" className="text-[10px] h-4 px-1 text-amber-700 border-amber-200 gap-0.5">
            <Lock className="h-2.5 w-2.5" /> sensitive
          </Badge>
        )}
      </div>
      {helpText && <p className="text-[11px] text-muted-foreground">{helpText}</p>}
      <div className="mt-1">
        {fieldType === "boolean" ? (
          <div className="flex items-center gap-2">
            <div className="h-4 w-7 rounded-full bg-muted border" />
            <span className="text-xs text-muted-foreground">Yes / No</span>
          </div>
        ) : (fieldType === "select" || fieldType === "multi_select") &&
          options &&
          options.length > 0 ? (
          <div className="h-7 border rounded px-2 flex items-center text-xs text-muted-foreground bg-background">
            {options[0]?.label ?? placeholder ?? "Select..."}
          </div>
        ) : (
          <div className="h-7 border rounded px-2 flex items-center text-xs text-muted-foreground bg-background">
            {placeholder ||
              `Enter ${
                fieldType === "date"
                  ? "a date"
                  : fieldType === "number" || fieldType === "currency"
                    ? "a number"
                    : "text"
              }...`}
          </div>
        )}
      </div>
    </div>
  );
}
