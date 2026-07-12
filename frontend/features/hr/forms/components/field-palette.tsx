"use client";

import { Button } from "@/components/ui/button";
import { HR_FIELD_TYPES, HR_FIELD_TYPE_META } from "../lib/field-type-meta";
import type { HrFormFieldType } from "../lib/types";

interface FieldPaletteProps {
  onAddField: (type: HrFormFieldType) => void;
}

export function FieldPalette({ onAddField }: FieldPaletteProps) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-1 pb-1">
        Field Types
      </p>
      <div className="grid grid-cols-1 gap-1">
        {HR_FIELD_TYPES.map((type) => {
          const meta = HR_FIELD_TYPE_META[type];
          return (
            <Button
              key={type}
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 justify-start text-xs font-normal text-left px-2"
              onClick={() => onAddField(type)}
            >
              <span className="w-full">{meta.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
