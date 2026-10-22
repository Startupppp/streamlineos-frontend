
export const PRIMARY_MANAGER_COLUMN = "primaryManagerEmail" as const;

export const LEGACY_PRIMARY_MANAGER_COLUMNS = ["reportingManagerEmail", "reportsTo", "managerEmail"] as const;

export const SECONDARY_MANAGER_COLUMNS = ["secondaryManagerEmail1", "secondaryManagerEmail2", "secondaryManagerEmail3"] as const;

export type ManagerColumn = typeof PRIMARY_MANAGER_COLUMN | (typeof SECONDARY_MANAGER_COLUMNS)[number];

const FRIENDLY_LEGACY_PRIMARY = ["reportingManager", "manager"] as const;
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
  values: Partial<Record<ManagerColumn, string>>;
  conflicts: ManagerColumn[];
  legacyPrimaryHeader: string | null;
}

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
