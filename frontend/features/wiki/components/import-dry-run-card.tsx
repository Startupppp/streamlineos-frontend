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
  const updateExisting = duplicatePolicy === "update";
  return (
    <div className="rounded-lg border border-border bg-muted/30 px-3 py-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">Import preview</span>
        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" type="button" onClick={onDismiss}>
          Dismiss
        </Button>
      </div>
      <div className={`grid gap-2 text-center text-xs ${updateExisting ? "grid-cols-2" : "grid-cols-3"}`}>
        <div>
          <span className="block font-mono text-sm">{result.wouldSucceed}</span>
          <span className="text-muted-foreground">{updateExisting ? "would import or update" : "would import"}</span>
        </div>
        {!updateExisting && (
          <div>
            <span className="block font-mono text-sm">{result.wouldSkip}</span>
            <span className="text-muted-foreground">would skip</span>
          </div>
        )}
        <div>
          <span className="block font-mono text-sm">{result.invalidItems.length}</span>
          <span className="text-muted-foreground">invalid</span>
        </div>
      </div>
      {updateExisting && <p className="text-xs text-muted-foreground">This preview cannot separate new pages from updates.</p>}
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
