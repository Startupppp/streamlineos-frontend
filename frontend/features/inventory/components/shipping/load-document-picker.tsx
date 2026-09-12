"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface LoadDocumentOption {
  id: number;
  label: string;
  sublabel: string;
}

interface LoadDocumentRowProps {
  option: LoadDocumentOption;
  checked: boolean;
  onToggle: (id: number) => void;
}

function LoadDocumentRow({ option, checked, onToggle }: LoadDocumentRowProps) {
  function handleCheckedChange(): void {
    onToggle(option.id);
  }

  return (
    <li>
      <label
        className={cn(
          "flex cursor-pointer items-center gap-3 px-3 py-2 transition-colors hover:bg-muted/50",
          checked && "bg-primary/5",
        )}
      >
        <Checkbox
          checked={checked}
          onCheckedChange={handleCheckedChange}
          aria-label={`Add ${option.label} to the load`}
        />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-xs font-medium">{option.label}</span>
          <span className="truncate text-micro text-muted-foreground">{option.sublabel}</span>
        </span>
      </label>
    </li>
  );
}

interface LoadDocumentPickerProps {
  options: LoadDocumentOption[];
  value: number[];
  onChange: (next: number[]) => void;
  isLoading: boolean;
  emptyText: string;
}

export function LoadDocumentPicker({
  options,
  value,
  onChange,
  isLoading,
  emptyText,
}: LoadDocumentPickerProps) {
  function handleToggle(id: number): void {
    onChange(value.includes(id) ? value.filter((picked) => picked !== id) : [...value, id]);
  }

  if (isLoading)
    return (
      <div className="flex flex-col gap-2 p-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-8 w-full" />
        ))}
      </div>
    );

  if (options.length === 0)
    return <p className="p-3 text-xs text-muted-foreground">{emptyText}</p>;

  return (
    <ul className="divide-y divide-border/60">
      {options.map((option) => (
        <LoadDocumentRow
          key={option.id}
          option={option}
          checked={value.includes(option.id)}
          onToggle={handleToggle}
        />
      ))}
    </ul>
  );
}
