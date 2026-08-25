"use client";

import { Badge } from "@/components/ui/badge";
import { Lock } from "lucide-react";
import { TruncatedText } from "@/components/ui/truncated-text";

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
      <div className="flex items-center gap-1.5 flex-wrap min-w-0">
        <TruncatedText text={name || "Untitled"} className="min-w-0 flex-1 text-sm font-medium" />
        {isRequired && (
          <Badge variant="outline" className="text-micro h-4 px-1 text-primary border-primary/30">
            required
          </Badge>
        )}
        {isSensitive && (
          <Badge variant="outline" className="text-micro h-4 px-1 text-status-warning-ink border-status-warning-rule gap-0.5">
            <Lock className="h-2.5 w-2.5" /> sensitive
          </Badge>
        )}
      </div>
      {helpText && <TruncatedText text={helpText} lines={2} className="text-dense text-muted-foreground" />}
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
