"use client";

import { cn } from "@/lib/utils";

interface FieldGroupProps {
  icon: React.ElementType;
  label: string;
  colorClass: string;
  children: React.ReactNode;
}

export function FieldGroup({
  icon: Icon,
  label,
  colorClass,
  children,
}: FieldGroupProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "h-7 w-7 rounded-lg flex items-center justify-center shrink-0",
            colorClass,
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </div>
        <span className="text-sm font-semibold text-foreground">{label}</span>
      </div>
      {children}
    </div>
  );
}
