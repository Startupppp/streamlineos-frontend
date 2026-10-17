import type { Release } from "@/types/projects";
import type { ReleaseFormValues } from "./release-form-schema";
import type { TicketConflictFieldDiff } from "@/features/build/ticket-details/ticket-conflict-diff";

const CONFLICT_EMPTY = "Not set";

export function displayConflictValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return CONFLICT_EMPTY;
  return String(value);
}

export function buildReleaseConflictDiffs(
  values: ReleaseFormValues,
  baseline: Release,
): TicketConflictFieldDiff[] {
  const stripMarkup = (value: string | null) =>
    value === null ? null : value.replace(/<[^>]*>/g, "").trim() || null;
  const pairs: Array<{ key: string; label: string; server: unknown; pending: unknown }> = [
    { key: "name", label: "Name", server: baseline.name, pending: values.name.trim() },
    { key: "version", label: "Version", server: baseline.version, pending: values.version.trim() },
    { key: "status", label: "Status", server: baseline.status, pending: values.status },
    {
      key: "releaseDate",
      label: "Release date",
      server: baseline.releaseDate ?? null,
      pending: values.releaseDate || null,
    },
    {
      key: "description",
      label: "Notes",
      server: stripMarkup(baseline.description ?? null),
      pending: stripMarkup(values.description ?? null),
    },
  ];
  return pairs
    .filter(({ server, pending }) => String(server ?? "") !== String(pending ?? ""))
    .map(({ key, label, server, pending }) => ({
      key,
      label,
      serverValue: displayConflictValue(server),
      pendingValue: displayConflictValue(pending),
    }));
}
