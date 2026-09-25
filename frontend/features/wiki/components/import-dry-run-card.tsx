"use client";

import { Button } from "@/components/ui/button";

interface DryRunResult {
  total: number;
  wouldSucceed: number;
  wouldSkip: number;
  invalidItems: string[];
}

interface ImportDryRunCardProps {
  result: DryRunResult;
  duplicatePolicy: string;
  onDismiss: () => void;
}

export function ImportDryRunCard({ result, duplicatePolicy, onDismiss }: ImportDryRunCardProps) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 px-3 py-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">Import preview</span>
        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" type="button" onClick={onDismiss}>
          Dismiss
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div>
          <span className="block font-mono text-sm">{result.wouldSucceed}</span>
          <span className="text-muted-foreground">would import</span>
        </div>
        <div>
          <span className="block font-mono text-sm">{result.wouldSkip}</span>
          <span className="text-muted-foreground">
            {duplicatePolicy === "skip" ? "would skip" : "would update"}
          </span>
        </div>
        <div>
          <span className="block font-mono text-sm">{result.invalidItems.length}</span>
          <span className="text-muted-foreground">invalid</span>
        </div>
      </div>
      {result.invalidItems.length > 0 ? (
        <div>
          <p className="text-xs text-muted-foreground font-medium mb-1">
            Invalid items — binary content detected
          </p>
          <ul className="space-y-0.5">
            {result.invalidItems.slice(0, 10).map((title) => (
              <li key={title} className="text-xs text-destructive truncate">
                {title}
              </li>
            ))}
          </ul>
          {result.invalidItems.length > 10 ? (
            <p className="text-xs text-muted-foreground">
              …and {result.invalidItems.length - 10} more
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
