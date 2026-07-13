"use client";

import { cn } from "@/lib/utils";

const IMPORT_TYPES = [
  { value: "products", label: "Products", description: "Items, SKUs, variants" },
  { value: "vendors", label: "Vendors", description: "Supplier information" },
  { value: "categories", label: "Categories", description: "Product categories" },
  { value: "uom", label: "Units of Measure", description: "UOM definitions" },
  { value: "locations", label: "Locations", description: "Warehouse locations" },
  { value: "opening-stock", label: "Opening Stock", description: "Initial stock quantities" },
  { value: "reorder-rules", label: "Reorder Rules", description: "Replenishment thresholds" },
] as const;

export type ImportType = (typeof IMPORT_TYPES)[number]["value"];

interface ImportTypeStepProps {
  selected: ImportType | null;
  onSelect: (type: ImportType) => void;
}

export function ImportTypeStep({ selected, onSelect }: ImportTypeStepProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Choose the type of data you want to import.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {IMPORT_TYPES.map(function renderTypeCard(item) {
          const isSelected = selected === item.value;
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => onSelect(item.value)}
              className={cn(
                "text-left rounded-xl border px-4 py-3 transition-colors",
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border bg-card hover:border-primary/40 hover:bg-accent/30",
              )}
            >
              <p className="font-medium text-sm text-foreground">{item.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
