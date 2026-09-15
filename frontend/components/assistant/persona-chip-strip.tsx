"use client";

import { useCallback } from "react";
import { cn } from "@/lib/utils";
import type { PersonaId } from "./ask-os-request-policy";

export type { PersonaId } from "./ask-os-request-policy";

interface PersonaChip {
  id: PersonaId;
  label: string;
}

const PERSONA_CHIPS: PersonaChip[] = [
  { id: "support", label: "Support" },
  { id: "sales", label: "CRM" },
  { id: "hr-policy", label: "HR" },
  { id: "project", label: "Build" },
  { id: "operations", label: "Inventory & Ops" },
];

interface PersonaChipStripProps {
  selected: PersonaId | null;
  onSelect: (id: PersonaId | null) => void;
  className?: string;
}

interface ChipButtonProps {
  chip: PersonaChip;
  isSelected: boolean;
  onSelect: (id: PersonaId | null) => void;
}

function ChipButton({ chip, isSelected, onSelect }: ChipButtonProps) {
  const handleClick = useCallback(() => {
    onSelect(isSelected ? null : chip.id);
  }, [chip.id, isSelected, onSelect]);

  return (
    <button
      key={chip.id}
      type="button"
      onClick={handleClick}
      className={cn(
        "flex-shrink-0 inline-flex items-center rounded-full px-2.5 py-1 text-dense font-medium transition-colors border",
        isSelected
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/50",
      )}
    >
      {chip.label}
    </button>
  );
}

export function PersonaChipStrip({ selected, onSelect, className }: PersonaChipStripProps) {
  return (
    <div className={cn("flex items-center gap-1.5 overflow-x-auto scrollbar-none", className)}>
      {PERSONA_CHIPS.map((chip) => (
        <ChipButton
          key={chip.id}
          chip={chip}
          isSelected={selected === chip.id}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
