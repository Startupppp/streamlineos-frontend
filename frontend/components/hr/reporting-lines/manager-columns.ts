/**
 * HRM-15. The one frontend definition of the manager columns a spreadsheet row
 * may carry — read by bulk onboarding and the bulk reporting-change mapping file.
 * Mirrors the backend's `reporting-manager-columns.ts`: headers match loosely
 * (case, spaces, `_` and `-` ignored), the three legacy primary headers are read
 * but never written, and two headers giving one column different values are a
 * conflict to refuse, never a guess.
 */

export const PRIMARY_MANAGER_COLUMN = "primaryManagerEmail" as const;

/** Read for one release (PRD §7.3, §8.4) — exactly the backend's set. */
export const LEGACY_PRIMARY_MANAGER_COLUMNS = ["reportingManagerEmail", "reportsTo", "managerEmail"] as const;

export const SECONDARY_MANAGER_COLUMNS = ["secondaryManagerEmail1", "secondaryManagerEmail2", "secondaryManagerEmail3"] as const;

export type ManagerColumn = typeof PRIMARY_MANAGER_COLUMN | (typeof SECONDARY_MANAGER_COLUMNS)[number];

/** Headers people type for the old single-manager column; they count as legacy use. */
const FRIENDLY_LEGACY_PRIMARY = ["reportingManager", "manager"] as const;
/** Spellings of the canonical columns themselves. */
const FRIENDLY_CANONICAL: ReadonlyArray<readonly [string, ManagerColumn]> = [
  ["primaryManager", PRIMARY_MANAGER_COLUMN],
  ["secondaryManager1", "secondaryManagerEmail1"],
  ["secondaryManager2", "secondaryManagerEmail2"],
  ["secondaryManager3", "secondaryManagerEmail3"],
];

function headerKey(header: string): string {
  return header.toLowerCase().replace(/[\s_-]/g, "");
}

const BY_HEADER = new Map<string, { column: ManagerColumn; legacy: boolean }>([
  [headerKey(PRIMARY_MANAGER_COLUMN), { column: PRIMARY_MANAGER_COLUMN, legacy: false }],
  ...SECONDARY_MANAGER_COLUMNS.map((column): [string, { column: ManagerColumn; legacy: boolean }] => [headerKey(column), { column, legacy: false }]),
  ...FRIENDLY_CANONICAL.map(([header, column]): [string, { column: ManagerColumn; legacy: boolean }] => [headerKey(header), { column, legacy: false }]),
  ...[...LEGACY_PRIMARY_MANAGER_COLUMNS, ...FRIENDLY_LEGACY_PRIMARY].map(
    (header): [string, { column: ManagerColumn; legacy: boolean }] => [headerKey(header), { column: PRIMARY_MANAGER_COLUMN, legacy: true }],
  ),
]);

/** Every header spelling this module knows, for tests that hold other readers to it. */
export const MANAGER_HEADER_ALIASES: readonly string[] = [
  PRIMARY_MANAGER_COLUMN,
  ...SECONDARY_MANAGER_COLUMNS,
  ...LEGACY_PRIMARY_MANAGER_COLUMNS,
  ...FRIENDLY_LEGACY_PRIMARY,
  ...FRIENDLY_CANONICAL.map(([header]) => header),
  "Reports To",
  "Manager Email",
  "Reporting Manager Email",
  "Secondary Manager Email 2",
];

export function resolveManagerHeader(header: string): { column: ManagerColumn; legacy: boolean } | null {
  return BY_HEADER.get(headerKey(header)) ?? null;
}

export interface ManagerColumnsResult {
  /** Trimmed, lower-cased value per column; a conflicting column is left out. */
  values: Partial<Record<ManagerColumn, string>>;
  conflicts: ManagerColumn[];
  /** The legacy header the primary came from, when no canonical header supplied it. */
  legacyPrimaryHeader: string | null;
}

/** Reads a raw row's manager columns (by raw header) the way the backend does. */
export function collectManagerColumns(row: Readonly<Record<string, string | undefined>>): ManagerColumnsResult {
  const sources = new Map<ManagerColumn, Array<{ header: string; legacy: boolean; value: string }>>();
  for (const [header, raw] of Object.entries(row)) {
    const resolved = resolveManagerHeader(header);
    const value = (raw ?? "").trim().toLowerCase();
    if (!resolved || !value) continue;
    sources.set(resolved.column, [...(sources.get(resolved.column) ?? []), { header, legacy: resolved.legacy, value }]);
  }

  const values: Partial<Record<ManagerColumn, string>> = {};
  const conflicts: ManagerColumn[] = [];
  let legacyPrimaryHeader: string | null = null;
  for (const [column, entries] of sources) {
    if (new Set(entries.map((entry) => entry.value)).size > 1) {
      conflicts.push(column);
      continue;
    }
    const chosen = entries.find((entry) => !entry.legacy) ?? entries[0];
    if (!chosen) continue;
    values[column] = chosen.value;
    if (column === PRIMARY_MANAGER_COLUMN && chosen.legacy) legacyPrimaryHeader = chosen.header;
  }
  return { values, conflicts, legacyPrimaryHeader };
}
