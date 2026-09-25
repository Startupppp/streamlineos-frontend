"use client";

import { Button } from "@/components/ui/button";

interface ImportFailedTitlesAlertProps {
  titles: string[];
  onDismiss: () => void;
}

export function ImportFailedTitlesAlert({ titles, onDismiss }: ImportFailedTitlesAlertProps) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-destructive">
          {titles.length} page{titles.length === 1 ? "" : "s"} could not be imported
        </p>
        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" type="button" onClick={onDismiss}>
          Dismiss
        </Button>
      </div>
      <ul className="space-y-0.5">
        {titles.slice(0, 20).map((t) => (
          <li key={t} className="text-xs text-muted-foreground truncate">
            {t}
          </li>
        ))}
      </ul>
      {titles.length > 20 ? (
        <p className="text-xs text-muted-foreground">…and {titles.length - 20} more</p>
      ) : null}
    </div>
  );
}
