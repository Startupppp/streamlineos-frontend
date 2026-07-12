"use client";

import { cn } from "@/lib/utils";
import { FIELD_TYPE_META } from "./field-types";
import { useBuilder } from "./builder-context";

export function FieldPalette({ hasRecipient }: { hasRecipient: boolean }) {
  const { placingFieldType, setPlacingFieldType } = useBuilder();

  return (
    <div className="space-y-2">
      {!hasRecipient && <p className="text-xs text-muted-foreground">Select a recipient first, then a field type, then click the document.</p>}
      <div className="grid grid-cols-2 gap-2">
        {FIELD_TYPE_META.map((meta) => {
          const Icon = meta.icon;
          const isActive = placingFieldType === meta.type;
          return (
            <button
              key={meta.type}
              type="button"
              disabled={!hasRecipient}
              onClick={() => setPlacingFieldType(isActive ? null : meta.type)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg border p-2.5 text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
                isActive ? "border-foreground bg-muted" : "border-border hover:bg-muted/50",
              )}
            >
              <Icon className="size-4" />
              <span className="truncate">{meta.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
