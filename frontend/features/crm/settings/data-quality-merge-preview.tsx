"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import type { DataQualityMergePreview } from "@/hooks/api/crm/data-quality-findings-schema";

const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  legalName: "Legal name",
  displayName: "Display name",
  taxNumber: "Tax number",
  website: "Website",
  email: "Email",
  phone: "Phone",
  notes: "Notes",
};

function fieldLabel(field: string) {
  return FIELD_LABELS[field] ?? field;
}

interface MergePreviewContentProps {
  preview: DataQualityMergePreview | undefined;
  isLoading: boolean;
  errorMessage: string | null;
}

/**
 * The body of the merge confirm: what survives, what it inherits, and what is
 * set aside. Values the survivor keeps over the other record are listed so
 * nobody learns about a discarded email after the fact.
 */
export function MergePreviewContent({ preview, isLoading, errorMessage }: MergePreviewContentProps) {
  if (isLoading)
    return (
      <div className="flex flex-col gap-2" aria-busy="true">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );

  if (errorMessage)
    return (
      <Alert variant="destructive">
        <AlertTitle>The preview could not be loaded</AlertTitle>
        <AlertDescription>{errorMessage}</AlertDescription>
      </Alert>
    );

  if (!preview) return null;

  return (
    <div className="flex flex-col gap-3 text-sm">
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        <dt className="text-muted-foreground">Keeps</dt>
        <dd className="font-medium">{preview.survivor.name}</dd>
        <dt className="text-muted-foreground">Absorbs</dt>
        <dd className="font-medium">{preview.merged.name}</dd>
      </dl>

      {preview.filledFields.length > 0 ? (
        <div className="flex flex-col gap-1">
          <p className="text-muted-foreground">Filled in from {preview.merged.name}:</p>
          <ul className="flex flex-col gap-0.5">
            {preview.filledFields.map((entry) => (
              <li key={entry.field}>
                {fieldLabel(entry.field)}: <span className="font-medium">{entry.value}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {preview.conflicts.length > 0 ? (
        <div className="flex flex-col gap-1">
          <p className="text-muted-foreground">Kept from {preview.survivor.name}, the other value is set aside:</p>
          <ul className="flex flex-col gap-0.5">
            {preview.conflicts.map((entry) => (
              <li key={entry.field}>
                {fieldLabel(entry.field)}: <span className="font-medium">{entry.kept ?? "—"}</span>
                <span className="text-muted-foreground"> (not {entry.discarded ?? "—"})</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="text-muted-foreground">
        Contacts, identifiers and linked leads, clients and organisations move to {preview.survivor.name}.
        The merge can be undone from this queue.
      </p>

      {preview.blockers.length > 0 ? (
        <Alert variant="destructive">
          <AlertTitle>These records now contradict each other</AlertTitle>
          <AlertDescription>{preview.blockers.join("; ")}. Dismiss the finding instead.</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
