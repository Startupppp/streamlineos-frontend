"use client";

import { cn } from "@/lib/utils";

export type PersonaId = "support" | "sales" | "hr-policy" | "project" | "operations";

interface PersonaChip {
  id: PersonaId;
  label: string;
}

const PERSONA_CHIPS: PersonaChip[] = [
  { id: "support", label: "Support" },
  { id: "sales", label: "Sales" },
  { id: "hr-policy", label: "HR Policy" },
  { id: "project", label: "Projects" },
  { id: "operations", label: "Operations" },
];

interface PersonaChipStripProps {
  selected: PersonaId | null;
  onSelect: (id: PersonaId | null) => void;
  className?: string;
}

export function PersonaChipStrip({ selected, onSelect, className }: PersonaChipStripProps) {
  return (
    <div className={cn("flex items-center gap-1.5 overflow-x-auto scrollbar-none", className)}>
      {PERSONA_CHIPS.map((chip) => (
        <button
          key={chip.id}
          type="button"
          onClick={() => onSelect(selected === chip.id ? null : chip.id)}
          className={cn(
            "flex-shrink-0 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors border",
            selected === chip.id
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/50",
          )}
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}
