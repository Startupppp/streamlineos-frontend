"use client";

import { Button } from "@/components/ui/button";
import type { KbImportErrorReport } from "@/hooks/api/kb/import-export";

export type ImportFailedItem = { index: number; title: string; reason?: string };

export function failedItemsFromReport(report: KbImportErrorReport | null): ImportFailedItem[] {
  if (report?.itemErrors && report.itemErrors.length > 0) {
    return report.itemErrors.map(({ index, title, reason }) => ({ index, title, reason }));
  }
  return (report?.failedTitles ?? []).map((title, index) => ({ index, title }));
}

export function ImportFailedItemsList({ items }: { items: ImportFailedItem[] }) {
  return (
    <ul className="space-y-1 text-xs text-muted-foreground">
      {items.map((item, position) => (
        <li key={`${item.index}-${position}`}>
          <span className="font-medium">Item {item.index + 1}: </span>
          <span>{item.title}</span>
          {item.reason ? <><span> — </span><span>{item.reason}</span></> : null}
        </li>
      ))}
    </ul>
  );
}

interface ImportFailedTitlesAlertProps {
  items: ImportFailedItem[];
  onDismiss: () => void;
}

export function ImportFailedTitlesAlert({ items, onDismiss }: ImportFailedTitlesAlertProps) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-destructive">
          {items.length} page{items.length === 1 ? "" : "s"} could not be imported
        </p>
        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" type="button" onClick={onDismiss}>
          Dismiss
        </Button>
      </div>
      <ImportFailedItemsList items={items.slice(0, 20)} />
      {items.length > 20 ? (
        <p className="text-xs text-muted-foreground">…and {items.length - 20} more</p>
      ) : null}
    </div>
  );
}
